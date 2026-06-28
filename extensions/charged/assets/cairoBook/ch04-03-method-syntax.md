## Method Syntax

_Methods_ are similar to functions: we declare them with the `fn` keyword and a
name, they can have parameters and a return value, and they contain some code
that’s run when the method is called from somewhere else. Unlike functions,
methods are defined within the context of a type and their first parameter is
always `self`, which represents the instance of the type the method is being
called on. For those familiar with Rust, Cairo's approach might be confusing,
as methods cannot be defined directly on types. Instead, you must define a trait
and an implementation associated with the type for which the method is intended.

### Defining Methods

Let’s change the `area` function that has a `Rectangle` instance as a parameter
and instead make an `area` method defined on the `RectangleTrait` trait, as shown
in Listing 5-13.

<span class="filename">Filename: src/lib.cairo</span>

```rust
use debug::PrintTrait;
#[derive(Copy, Drop)]
struct Rectangle {
    width: u64,
    height: u64,
}

trait RectangleTrait {
    fn area(self: @Rectangle) -> u64;
}

impl RectangleImpl of RectangleTrait {
    fn area(self: @Rectangle) -> u64 {
        (*self.width) * (*self.height)
    }
}

fn main() {
    let rect1 = Rectangle { width: 30_u64, height: 50_u64,  };

    rect1.area().print();
}
```

<span class="caption">Listing 4-13: Defining an `area` method to use on the
`Rectangle` </span>

To define the function within the context of `Rectangle`, we start by definining a `trait`
block with the signature of the method that we want to implement. Traits are not linked to
a specific type; only the `self` parameter of the method defines which type it can be used
with. Then, we define an `impl` (implementation) block for `RectangleTrait`, that defines
the behavior of the methods implemented. Everything within this `impl` block will be
associated with the type of the `self` parameter of the method called. While it is technically
possible to define methods for multiple types within the same `impl` block, it is not
a recommended practice, as it can lead to confusion. We recommend that the type of the `self` parameter
stays consistent within the same `impl` block.
Then we move the `area` function within the `impl` curly brackets and change the first (and in this case, only)
parameter to be `self` in the signature and everywhere within the body. In
`main`, where we called the `area` function and passed `rect1` as an argument,
we can instead use the _method syntax_ to call the `area` method on our `Rectangle`
instance. The method syntax goes after an instance: we add a dot followed by
the method name, parentheses, and any arguments.

Methods must have a parameter named `self` of the type they will be applied to for their first parameter.
Note that we used the `@` snapshot operator in front of the `Rectangle` type in the function signature.
By doing so, we indicate that this method takes an immutable snapshot of the `Rectangle` instance, which is
automatically created by the compiler when passing the instance to the method.
Methods can take ownership of `self`, use `self` with snapshots as we’ve done here, or use a mutable reference to `self`
using the `ref self: T` syntax.

We chose `self: @Rectangle` here for the same reason we used `@Rectangle` in the function
version: we don’t want to take ownership, and we just want to read the data in
the struct, not write to it. If we wanted to change the instance that we’ve
called the method on as part of what the method does, we’d use `ref self: Rectangle` as
the first parameter. Having a method that takes ownership of the instance by
using just `self` as the first parameter is rare; this technique is usually
used when the method transforms `self` into something else and you want to
prevent the caller from using the original instance after the transformation.

Observe the use of the desnap operator `*` within the area method when accessing the struct's members.
This is necessary because the struct is passed as a snapshot, and all of its field values are of type `@T`,
requiring them to be desnapped in order to manipulate them.

The main reason for using methods instead of functions is for organization and code clarity. We’ve put all the things we can do with an instance of a type in one combination of `trait` & `impl` blocks, rather than making future users
of our code search for capabilities of `Rectangle` in various places in the
library we provide. However, we can define multiple combinations of `trait` & `impl` blocks for the same type at different places, which can be useful for a more granular code organization. For example, you could implement
the `Add` trait for your type in one `impl` block, and the `Sub` trait in another block.

Note that we can choose to give a method the same name as one of the struct’s
fields. For example, we can define a method on `Rectangle` that is also named
`width`:

<span class="filename">Filename: src/lib.cairo</span>

```rust
use debug::PrintTrait;
#[derive(Copy, Drop)]
struct Rectangle {
    width: u64,
    height: u64,
}

trait RectangleTrait {
    fn width(self: @Rectangle) -> bool;
}

impl RectangleImpl of RectangleTrait {
    fn width(self: @Rectangle) -> bool {
        (*self.width) > 0_u64
    }
}

fn main() {
    let rect1 = Rectangle { width: 30_u64, height: 50_u64,  };
    rect1.width().print();
}
```

Here, we’re choosing to make the `width` method return `true` if the value in
the instance’s `width` field is greater than `0` and `false` if the value is
`0`: we can use a field within a method of the same name for any purpose. In
`main`, when we follow `rect1.width` with parentheses, Cairo knows we mean the
method `width`. When we don’t use parentheses, Cairo knows we mean the field
`width`.

### Methods with More Parameters

Let’s practice using methods by implementing a second method on the `Rectangle`
struct. This time we want an instance of `Rectangle` to take another instance
of `Rectangle` and return `true` if the second `Rectangle` can fit completely
within `self` (the first `Rectangle`); otherwise, it should return `false`.
That is, once we’ve defined the `can_hold` method, we want to be able to write
the program shown in Listing 5-14.

<span class="filename">Filename: src/lib.cairo</span>

```rust
use debug::PrintTrait;
#[derive(Copy, Drop)]
struct Rectangle {
    width: u64,
    height: u64,
}

fn main() {
    let rect1 = Rectangle { width: 30_u64, height: 50_u64,  };
    let rect2 = Rectangle { width: 10_u64, height: 40_u64,  };
    let rect3 = Rectangle { width: 60_u64, height: 45_u64,  };

    'Can rect1 hold rect2?'.print();
    rect1.can_hold(@rect2).print();

    'Can rect1 hold rect3?'.print();
    rect1.can_hold(@rect3).print();
}
```

<span class="caption">Listing 5-14: Using the as-yet-unwritten `can_hold`
method</span>

The expected output would look like the following because both dimensions of
`rect2` are smaller than the dimensions of `rect1`, but `rect3` is wider than
`rect1`:

```text
❯ cairo-run src/lib.cairo
[DEBUG]	Can rec1 hold rect2?           	(raw: 384675147322001379018464490539350216396261044799)

[DEBUG]	true                           	(raw: 1953658213)

[DEBUG]	Can rect1 hold rect3?          	(raw: 384675147322001384331925548502381811111693612095)

[DEBUG]	false                          	(raw: 439721161573)

```

We know we want to define a method, so it will be within the `trait RectangleTrait`
and `impl RectangleImpl of RectangleTrait` blocks.
The method name will be `can_hold`, and it will take a snapshot
of another `Rectangle` as a parameter. We can tell what the type of the
parameter will be by looking at the code that calls the method:
`rect1.can_hold(@rect2)` passes in `@rect2`, which is a snapshot to
`rect2`, an instance of `Rectangle`. This makes sense because we only need to
read `rect2` (rather than write, which would mean we’d need a mutable borrow),
and we want `main` to retain ownership of `rect2` so we can use it again after
calling the `can_hold` method. The return value of `can_hold` will be a
Boolean, and the implementation will check whether the width and height of
`self` are greater than the width and height of the other `Rectangle`,
respectively. Let’s add the new `can_hold` method to the `trait` and `impl` blocks from
Listing 5-13, shown in Listing 5-15.

<span class="filename">Filename: src/lib.cairo</span>

```rust
trait RectangleTrait {
    fn area(self: @Rectangle) -> u64;
    fn can_hold(self: @Rectangle, other: @Rectangle) -> bool;
}

impl RectangleImpl of RectangleTrait {
    fn area(self: @Rectangle) -> u64 {
        *self.width * *self.height
    }

    fn can_hold(self: @Rectangle, other: @Rectangle) -> bool {
        *self.width > *other.width & *self.height > *other.height
    }
}
```

<span class="caption">Listing 5-15: Implementing the `can_hold` method on
`Rectangle` that takes another `Rectangle` instance as a parameter</span>

When we run this code with the `main` function in Listing 5-14, we’ll get our
desired output. Methods can take multiple parameters that we add to the
signature after the `self` parameter, and those parameters work just like
parameters in functions.

### Accessing implementation functions

All functions defined within a `trait` and `impl` block can be directly addressed
using the `::` operator on the implementation name.
Functions in traits that aren’t methods are often used for constructors that
will return a new instance of the struct. These are often called `new`, but
`new` isn’t a special name and isn’t built into the language. For example, we
could choose to provide an associated function named `square` that would have
one dimension parameter and use that as both width and height, thus making it
easier to create a square `Rectangle` rather than having to specify the same
value twice:

<span class="filename">Filename: src/lib.cairo</span>

```rust
trait RectangleTrait {
    fn square(size: u64) -> Rectangle;
}

impl RectangleImpl of RectangleTrait {
    fn square(size: u64) -> Rectangle {
        Rectangle { width: size, height: size }
    }
}
```

To call this function, we use the `::` syntax with the implementation name;
`let square = RectangleImpl::square(10_u64);` is an example. This function is namespaced by
the implementation; the `::` syntax is used for both trait functions and
namespaces created by modules. We’ll discuss modules in [Chapter 7][modules]<!-- ignore -->.

> Note: It is also possible to call this function using the trait name, with `RectangleTrait::square(10_u64)`.

### Multiple `impl` Blocks

Each struct is allowed to have multiple `trait` and `impl` blocks. For example, Listing
5-15 is equivalent to the code shown in Listing 5-16, which has each method in
its own `trait` and `impl` blocks.

```rust
trait RectangleCalc {
    fn area(self: @Rectangle) -> u64;
}
impl RectangleCalcImpl of RectangleCalc {
    fn area(self: @Rectangle) -> u64 {
        (*self.width) * (*self.height)
    }
}

trait RectangleCmp {
    fn can_hold(self: @Rectangle, other: @Rectangle) -> bool;
}

impl RectangleCmpImpl of RectangleCmp {
    fn can_hold(self: @Rectangle, other: @Rectangle) -> bool {
        *self.width > *other.width & *self.height > *other.height
    }
}
```

<span class="caption">Listing 5-16: Rewriting Listing 5-15 using multiple `impl`
blocks</span>

There’s no reason to separate these methods into multiple `trait` and `impl` blocks here,
but this is valid syntax. We’ll see a case in which multiple blocks are
useful in [Chapter 7](ch07-00-generic-types-and-traits.md), where we discuss generic types and traits.

## Summary

Structs let you create custom types that are meaningful for your domain. By
using structs, you can keep associated pieces of data connected to each other
and name each piece to make your code clear. In `trait` and `impl` blocks, you can define
methods, which are functions associated to a type and let you specify the behavior that instances of your
type have.

But structs aren’t the only way you can create custom types: let’s turn to
Cairo’s enum feature to add another tool to your toolbox.
