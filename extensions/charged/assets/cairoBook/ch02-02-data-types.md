## Data Types

Every value in Cairo is of a certain _data type_, which tells Cairo what kind of
data is being specified so it knows how to work with that data. This section covers two subsets of data types: scalars and compounds.

Keep in mind that Cairo is a _statically typed_ language, which means that it
must know the types of all variables at compile time. The compiler can usually infer the desired type based on the value and its usage. In cases
when many types are possible, we can use a cast method where we specify the desired output type.

```Rust
use traits::TryInto;
use option::OptionTrait;
fn main(){
    let x: felt252 = 3;
    let y:u32 = x.try_into().unwrap();
}
```

You’ll see different type annotations for other data types.

### Scalar Types

A _scalar_ type represents a single value. Cairo has three primary scalar types:
felts, integers, and booleans. You may recognize
these from other programming languages. Let’s jump into how they work in Cairo.

#### Felt Type

In Cairo, if you don't specify the type of a variable or argument, its type defaults to a field element, represented by the keyword `felt252`. In the context of Cairo, when we say “a field element” we mean an integer in the range `0 <= x < P`,
where `P` is a very large prime number currently equal to `P = 2^{251} + 17 * 2^{192}+1`. When adding, subtracting, or multiplying, if the result falls outside the specified range of the prime number, an overflow occurs, and an appropriate multiple of P is added or subtracted to bring the result back within the range (i.e., the result is computed modulo P).

The most important difference between integers and field elements is division: Division of field elements (and therefore division in Cairo) is unlike regular CPUs division, where
integer division `x / y` is defined as `[x/y]` where the integer part of the quotient is returned (so you get `7 / 3 = 2`) and it may or may not satisfy the equation `(x / y) * y == x`,
depending on the divisibility of `x` by `y`.

In Cairo, the result of `x/y` is defined to always satisfy the equation `(x / y) * y == x`. If y divides x as integers, you will get the expected result in Cairo (for example `6 / 2`
will indeed result in `3`).
But when y does not divide x, you may get a surprising result: For example, since `2 * ((P+1)/2) = P+1 ≡ 1 mod[P]`, the value of `1 / 2` in Cairo is `(P+1)/2` (and not 0 or 0.5), as it satisfies the above equation.

#### Integer Types

The felt252 type is a fundamental type that serves as the basis for creating all types in the core library.
However, it is highly recommended for programmers to use the integer types instead of the `felt252` type whenever possible, as the `integer` types come with added security features that provide extra protection against potential vulnerabilities in the code, such as overflow checks. By using these integer types, programmers can ensure that their programs are more secure and less susceptible to attacks or other security threats.
An _integer_ is a number without a fractional component. This type declaration indicates the number of bits the programmer can use to store the integer.
Table 3-1 shows
the built-in integer types in Cairo. We can use any of these variants to declare
the type of an integer value.

<span class="caption">Table 3-1: Integer Types in Cairo</span>

| Length  | Unsigned |
| ------- | -------- |
| 8-bit   | `u8`     |
| 16-bit  | `u16`    |
| 32-bit  | `u32`    |
| 64-bit  | `u64`    |
| 128-bit | `u128`   |
| 256-bit | `u256`   |
| 32-bit  | `usize`  |

Each variant has an explicit size. Note that for now, the `usize` type is just an alias for `u32`; however, it might be useful when in the future Cairo can be compiled to MLIR.
As variables are unsigned, they can't contain a negative number. This code will cause the program to panic:

```rust
fn sub_u8s(x: u8, y: u8) -> u8 {
    x - y
}

fn main() {
    sub_u8s(1, 3);
}
```

You can write integer literals in any of the forms shown in Table 3-2. Note
that number literals that can be multiple numeric types allow a type suffix,
such as `57_u8`, to designate the type.

<span class="caption">Table 3-2: Integer Literals in Cairo</span>

| Numeric literals | Example   |
| ---------------- | --------- |
| Decimal          | `98222`   |
| Hex              | `0xff`    |
| Octal            | `0o04321` |
| Binary           | `0b01`    |

So how do you know which type of integer to use? Try to estimate the max value your int can have and choose the good size.
The primary situation in which you’d use `usize` is when indexing some sort of collection.

#### Numeric Operations

Cairo supports the basic mathematical operations you’d expect for all the integer
types: addition, subtraction, multiplication, division, and remainder. Integer
division truncates toward zero to the nearest integer. The following code shows
how you’d use each numeric operation in a `let` statement:

```rust
fn main() {
     // addition
    let sum = 5_u128 + 10_u128;

    // subtraction
    let difference = 95_u128 - 4_u128;

    // multiplication
    let product = 4_u128 * 30_u128;

    // division
    let quotient = 56_u128 / 32_u128; //result is 1
    let quotient = 64_u128 / 32_u128; //result is 2

    // remainder
    let remainder = 43_u128 % 5_u128; // result is 3
}
```

Each expression in these statements uses a mathematical operator and evaluates
to a single value, which is then bound to a variable.

<!-- TODO: Appendix operator -->
<!-- [Appendix B][appendix_b] ignore contains a list of all operators that Cairo provides. -->

#### The Boolean Type

As in most other programming languages, a Boolean type in Cairo has two possible
values: `true` and `false`. Booleans are one felt252 in size. The Boolean type in
Cairo is specified using `bool`. For example:

```rust
fn main() {
    let t = true;

    let f: bool = false; // with explicit type annotation
}
```

[//]: # "TODO: control flow section"

The main way to use Boolean values is through conditionals, such as an `if`
expression. We’ll cover how `if` expressions work in Cairo in the [“Control
Flow”][control-flow] section.

#### The Short String Type

Cairo doesn't have a native type for strings, but you can store characters forming what we call a "short string" inside `felt252`s. A short string has a max length of 31 chars. This is to ensure that it can fit in a single felt (a felt is 252 bits, one ASCII char is 8 bits).
Here are some examples of declaring values by putting them between single quotes:

```rust
let my_first_char = 'C';
let my_first_string = 'Hello world';
```

### Type casting

In Cairo, you can convert values between common scalar types and `felt252` using the `try_into` and `into` methods provided by the `TryInto` and `Into` traits, respectively.

The `try_into` method allows for safe type casting when the target type might not fit the source value. Keep in mind that `try_into` returns an `Option<T>` type, which you'll need to unwrap to access the new value.

On the other hand, the `into` method can be used for type casting when success is guaranteed, such as when the source type is smaller than the destination type.

To perform the conversion, call `var.into()` or `var.try_into()` on the source value to cast it to another type. The new variable's type must be explicitly defined, as demonstrated in the example below.

```rust
use traits::TryInto;
use traits::Into;
use option::OptionTrait;

fn main(){
    let my_felt = 10;
    let my_u8: u8 = my_felt.try_into().unwrap(); // Since a felt252 might not fit in a u8, we need to unwrap the Option<T> type
    let my_u16: u16 = my_felt.try_into().unwrap();
    let my_u32: u32 = my_felt.try_into().unwrap();
    let my_u64: u64 = my_felt.try_into().unwrap();
    let my_u128: u128 = my_felt.try_into().unwrap();
    let my_u256: u256 = my_felt.into(); // As a felt252 is smaller than a u256, we can use the into() method
    let my_usize: usize = my_felt.try_into().unwrap();
    let my_felt2: felt252 = my_u8.into();
    let my_felt3: felt252 = my_u16.into();
}
```

### The Tuple Type

A _tuple_ is a general way of grouping together a number of values with a
variety of types into one compound type. Tuples have a fixed length: once
declared, they cannot grow or shrink in size.

We create a tuple by writing a comma-separated list of values inside
parentheses. Each position in the tuple has a type, and the types of the
different values in the tuple don’t have to be the same. We’ve added optional
type annotations in this example:

```rust
fn main() {
    let tup: (u32,u64,bool) = (10,20,true);
}
```

The variable `tup` binds to the entire tuple because a tuple is considered a
single compound element. To get the individual values out of a tuple, we can
use pattern matching to destructure a tuple value, like this:

```rust
use debug::PrintTrait;
fn main() {
    let tup = (500, 6, true);

    let (x, y, z) = tup;

    if y == 6 {
        'y is six!'.print();
    }
}
```

This program first creates a tuple and binds it to the variable `tup`. It then
uses a pattern with `let` to take `tup` and turn it into three separate
variables, `x`, `y`, and `z`. This is called _destructuring_ because it breaks
the single tuple into three parts. Finally, the program prints `y is six` as the value of
`y` is `6`.

We can also declare the tuple with value and name at the same time.
For example:

```rust
fn main() {
    let (x, y): (felt252, felt252) = (2, 3);
}
```

### The unit type ()

A _unit type_ is a type which has only one value `()`.
It is represented by a tuple with no elements.
Its size is always zero, and it is guaranteed to not exist in the compiled code.

[control-flow]: ch02-05-control-flow.md
