## What Is Ownership?

Cairo implements an ownership system to ensure the safety and correctness of its compiled code.
The ownership mechanism complements the linear type system, which enforces that objects are used exactly once.
This helps prevent common operations that can produce runtime errors, such as illegal memory address
references or multiple writes to the same memory address, and ensures the soundness of Cairo programs
by checking at compile time that all the dictionaries are squashed.

Now that we’re past basic Cairo syntax, we won’t include all the `fn main() {`
code in examples, so if you’re following along, make sure to put the following
examples inside a `main` function manually. As a result, our examples will be a
bit more concise, letting us focus on the actual details rather than
boilerplate code.

### Ownership Rules

First, let’s take a look at the ownership rules. Keep these rules in mind as we
work through the examples that illustrate them:

- Each value in Cairo has an _owner_.
- There can only be one owner at a time.
- When the owner goes out of scope, the value will be _dropped_.

### Variable Scope

As a first example of ownership, we’ll look at the _scope_ of some variables. A
scope is the range within a program for which an item is valid. Take the
following variable:

```rust
let s = 'hello';
```

The variable `s` refers to a short string, where the value of the string is
hardcoded into the text of our program. The variable is valid from the point at
which it’s declared until the end of the current _scope_. Listing 3-1 shows a
program with comments annotating where the variable `s` would be valid.

```rust
    {                      // s is not valid here, it’s not yet declared
        let s = 'hello';   // s is valid from this point forward

        // do stuff with s
    }                      // this scope is now over, and s is no longer valid
```

<span class="caption">Listing 3-1: A variable and the scope in which it is
valid</span>

In other words, there are two important points in time here:

- When `s` comes _into_ scope, it is valid.
- It remains valid until it goes _out of_ scope.

At this point, the relationship between scopes and when variables are valid is
similar to that in other programming languages. Now we’ll build on top of this
understanding by using the `Array` type we introduced in the [previous chapter](ch02-06-common-collections.md).

### Ownership with the `Array` Type

To illustrate the rules of ownership, we need a data type that is more complex.
The types covered in the [“Data Types”][data-types]<!-- ignore --> section
of Chapter 2 are of a known size, can be
quickly and trivially copied to make a new, independent instance if another
part of code needs to use the same value in a different scope, and can easily
be dropped when they're no longer used. But what is the behavior with the `Array` type whose size
is unknown at compile time and which can't be trivially copied ?

Here is a short reminder of what an array looks like:

```rust
let mut arr = ArrayTrait::<u128>::new();
arr.append(1);
arr.append(2);
```

So, how does the ownership system ensure that each cell is never written to more than once?
Consider the following code, where we try to pass the same instance of an array in two consecutive
function calls:

```rust
use array::ArrayTrait;
fn foo(arr: Array<u128>) {
}

fn bar(arr:Array<u128>){
}

fn main() {
    let mut arr = ArrayTrait::<u128>::new();
    foo(arr);
    bar(arr);
}
```

In this case, we try to pass the same array instance `arr` by value to the functions `foo` and `bar`, which means
that the parameter used in both function calls is the same instance of the array. If you append a value to the array
in `foo`, and then try to append another value to the same array in `bar`, what would happen is that
you would attempt to try to write to the same memory cell twice, which is not allowed in Cairo.
To prevent this, the ownership of the `arr` variable moves from the `main` function to the `foo` function. When trying
to call `bar` with `arr` as a parameter, the ownership of `arr` was already moved to the first call. The ownership
system thus prevents us from using the same instance of `arr` in `foo`.

Running the code above will result in a compile-time error:

```console
error: Variable was previously moved. Trait has no implementation in context: core::traits::Copy::<core::array::Array::<core::integer::u128>>
 --> array.cairo:6:9
    let mut arr = ArrayTrait::<u128>::new();
        ^*****^
```

### The `Copy` Trait

If a type implements the `Copy` trait, passing it to a function will not move the ownership of the value to the function called, but will instead pass a copy of the value.
You can implement the `Copy` trait on your type by adding the `#[derive(Copy)]` annotation to your type definition. However, Cairo won't allow a type to be annotated with Copy if the type itself or any of its components don't implement the Copy trait.
While Arrays and Dictionaries can't be copied, custom types that don't contain either of them can be.

```rust
#[derive(Copy, Drop)]
struct Point {
    x: u128,
    y: u128,
}

fn main() {
    let p1 = Point { x: 5, y: 10 };
    foo(p1);
    foo(p1);
}

fn foo(p: Point) {
    // do something with p
}
```

In this example, we can pass `p1` twice to the foo function because the `Point` type implements the `Copy` trait. This means that when we pass `p1` to `foo`, we are actually passing a copy of `p1`, and the ownership of `p1` remains with the main function.
If you remove the `Copy` trait derivation from the `Point` type, you will get a compile-time error when trying to compile the code.

_Don't worry about the `Struct` keyword. We will introduce this in [Chapter 4](ch04-00-using-structs-to-structure-related-data.md)._

### The `Drop` Trait

You may have noticed that the `Point` type in the previous example also implements the `Drop` trait. In Cairo, a value cannot go out of scope unless it has been previously moved.
For example, the following code will not compile, because the struct `A` is not moved before it goes out of scope:

```rust
struct A {}

fn main() {
    A {}; // error: Value not dropped.
}
```

This is to ensure the soundness of Cairo programs. Soundness refers to the fact that if a
statement during the execution of the program is false, no cheating prover can convince an
honest verifier that it is true. In our case, we want to ensure the consistency of
consecutive dictionary key updates during program execution, which is only checked when
the dictionaries are`squashed` - which moves the ownership of the dictionary to the
`squash` method, thus allowing the dictionary to go out of scope. Unsquashed dictionaries
are dangerous, as a malicious prover could prove the correctness of inconsistent updates.

However, types that implement the `Drop` trait are allowed to go out of scope without being explicitly moved. When a value of a type that implements the `Drop` trait goes out of scope, the `Drop` implementation is called on the type, which moves the value to the `drop` function, allowing it to go out of scope - This is what we call "dropping" a value.
It is important to note that the implementation of drop is a "no-op", meaning that it doesn't perform any actions other than allowing the value to go out of scope.

The `Drop` implementation can be derived for all types, allowing them to be dropped when goint out of scope, except for dictionaries (`Felt252Dict`) and types containing dictionaries.
For example, the following code compiles:

```rust
#[derive(Drop)]
struct A {}

fn main() {
    A {}; // Now there is no error.
}
```

### The `Destruct` Trait

Manually calling the `squash` method on a dictionary is not very convenient, and it is easy to forget to do so. To make it easier to use dictionaries, Cairo provides the `Destruct` trait, which allows you to specify the behavior of a type when it goes out of scope. While Dictionaries don't implement the `Drop` trait, they do implement the `Destruct` trait, which allows them to automatically be `squashed` when they go out of scope. This means that you can use dictionaries without having to manually call the `squash` method.

Consider the following example, in which we define a custom type that contains a dictionary:

```rust
use dict::Felt252DictTrait;

struct A {
    dict: Felt252Dict<u128>
}

fn main() {
    A {
        dict: Felt252DictTrait::new()
    };
}
```

If you try to run this code, you will get a compile-time error:

```console
error: Variable not dropped. Trait has no implementation in context: core::traits::Drop::<temp7::temp7::A>. Trait has no implementation in context: core::traits::Destruct::<temp7::temp7::A>.
 --> temp7.cairo:7:5
    A {
    ^*^
```

When A goes out of scope, it can't be dropped as it implements neither the `Drop` (as it contains a dictionary and can't `derive(Drop)`) nor the `Destruct` trait. To fix this, we can derive the `Destruct` trait implementation for the `A` type:

```rust
use dict::Felt252DictTrait;

#[derive(Destruct)]
struct A {
    dict: Felt252Dict<u128>
}

fn main() {
    A {
        dict: Felt252DictTrait::new()
    }; // No error here
}
```

Now, when `A` goes out of scope, its dictionary will be automatically `squashed`, and the program will compile.

### Copy Array data with Clone

If we _do_ want to deeply copy the data of an `Array`, we can use a common method called `clone`. We’ll discuss method syntax in Chapter 5, but because methods are a common feature in many
programming languages, you’ve probably seen them before.

Here’s an example of the `clone` method in action.

> Note: in the following example, we need to import the `Clone` trait from the corelib `clone` module, and its implementation for the array type from the `array` module.

```rust
use array::ArrayTrait;
use clone::Clone;
use array::ArrayTCloneImpl;
...
let arr1 = ArrayTrait::<u128>::new();
let arr2 = arr1.clone();

```

> Note: you will need to run `cairo-run` with the `--available-gas=2000000` option to run this example, because it uses a loop and must be ran with a gas limit.

When you see a call to `clone`, you know that some arbitrary code is being
executed and that code may be expensive. It’s a visual indicator that something
different is going on.

### Ownership and Functions

Passing a variable to a function will either move it or copy it. As seen in the Array section, passing an `Array` as a function parameter transfers its ownership; let's see what happens with other types.

Listing 3-3 has an example with some annotations
showing where variables go into and out of scope.

<span class="filename">Filename: src/main.cairo</span>

```rust
#[derive(Drop)]
struct MyStruct{}

fn main() {
    let my_struct = MyStruct{};  // my_struct comes into scope

    takes_ownership(my_struct);     // my_struct's value moves into the function...
                                    // ... and so is no longer valid here

    let x = 5_u128;                 // x comes into scope

    makes_copy(x);                  // x would move into the function,
                                    // but u128 implements Copy, so it is okay to still
                                    // use x afterward

}                                   // Here, x goes out of scope and is dropped.


fn takes_ownership(some_struct: MyStruct) { // some_struct comes into scope
} // Here, some_struct goes out of scope and `drop` is called.

fn makes_copy(some_uinteger: u128) { // some_uinteger comes into scope
} // Here, some_integer goes out of scope and is dropped.
```

<span class="caption">Listing 3-3: Functions with ownership and scope
annotated</span>

If we tried to use `my_struct` after the call to `takes_ownership`, Cairo would throw a
compile-time error. These static checks protect us from mistakes. Try adding
code to `main` that uses `my_struct` and `x` to see where you can use them and where
the ownership rules prevent you from doing so.

### Return Values and Scope

Returning values can also transfer ownership. Listing 3-4 shows an example of a
function that returns some value, with similar annotations as those in Listing
4-3.

<span class="filename">Filename: src/main.cairo</span>

```rust
#[derive(Drop)]
struct A{}

fn main() {
    let a1 = gives_ownership();           // gives_ownership moves its return
                                          // value into a1

    let a2 = A{};                         // a2 comes into scope

    let a3 = takes_and_gives_back(a2);    // a2 is moved into
                                          // takes_and_gives_back, which also
                                          // moves its return value into a3

} // Here, a3 goes out of scope and is dropped. a2 was moved, so nothing
  // happens. a1 goes out of scope and is dropped.

fn gives_ownership() -> A {               // gives_ownership will move its
                                          // return value into the function
                                          // that calls it

    let some_a = A{};                     // some_a comes into scope

    some_a                                // some_a is returned and
                                          // moves ownership to the calling
                                          // function
}

// This function takes an instance some_a of A and returns it
fn takes_and_gives_back(some_a: A) -> A { // some_a comes into
                                          // scope

    some_a                               // some_a is returned and moves
                                         // ownership to the calling
                                         // function
}
```

<span class="caption">Listing 3-4: Transferring ownership of return
values</span>

When a variable goes out of scope, its value is dropped, unless ownership of the value has been moved to another variable.

While this works, taking ownership and then returning ownership with every
function is a bit tedious. What if we want to let a function use a value but
not take ownership? It’s quite annoying that anything we pass in also needs to
be passed back if we want to use it again, in addition to any data resulting
from the body of the function that we might want to return as well.

Cairo does let us return multiple values using a tuple, as shown in Listing 3-5.

<span class="filename">Filename: src/main.cairo</span>

```rust
use array::ArrayTrait;
fn main() {
    let arr1 = ArrayTrait::<u128>::new();

    let (arr2, len) = calculate_length(arr1);
}

fn calculate_length(arr: Array<u128>) -> (Array<u128>, usize) {
    let length = arr.len(); // len() returns the length of an array

    (arr, length)
}
```

<span class="caption">Listing 3-5: Returning ownership of parameters</span>

But this is too much ceremony and a lot of work for a concept that should be
common. Luckily for us, Cairo has two features for using a value without
transferring ownership, called _references_ and _snapshots_.

[data-types]: ch02-02-data-types.html#data-types
[method-syntax]: ch04-03-method-syntax.html#method-syntax
