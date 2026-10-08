# Appendix C: Derivable Traits

In various places in the book, we’ve discussed the `derive` attribute, which you can apply to a struct or enum definition. The `derive` attribute generates code to implement a default trait on the type you’ve annotated with the `derive` syntax.

In this appendix, we provide a comprehensive reference detailing all the traits in the standard library compatible with the `derive` attribute.

These traits listed here are the only ones defined by the core library that can be implemented on your types using `derive`. Other traits defined in the standard library don’t have sensible default behavior, so it’s up to you to implement them in the way that makes sense for what you’re trying to accomplish.

The list of derivable traits provided in this appendix does not encompass all possibilities: external libraries can implement `derive` for their own traits, expanding the list of traits compatible with `derive`.

## PartialEq for equality comparison

The `PartialEq` trait allows for comparison between instances of a type for equality, thereby enabling the == and != operators.

When `PartialEq` is derived on structs, two instances are equal only if all fields are equal, and the instances are not equal if any fields are not equal. When derived on enums, each variant is equal to itself and not equal to the other variants.

Example:

```Rust
#[derive(PartialEq, Drop)]
struct A {
    item: felt252
}

fn main() {
    let first_struct = A {
        item: 2
    };
    let second_struct = A {
        item: 2
    };
    assert(first_struct == second_struct, 'Structs are different');
}
```

## Clone and Copy for Duplicating Values

The `Clone` trait provides the functionality to explicitly create a deep copy of a value.

Deriving `Clone` implements the `clone` method, which, in turn, calls clone on each of the type's components. This means all the fields or values in the type must also implement `Clone` to derive `Clone`.

Example:

```Rust
use clone::Clone;

#[derive(Clone, Drop)]
struct A {
    item: felt252
}

fn main() {
    let first_struct = A {
        item: 2
    };
    let second_struct = first_struct.clone();
    assert(second_struct.item == 2, 'Not equal');
}
```

The `Copy` trait allows for the duplication of values. You can derive `Copy` on any type whose parts all implement `Copy`.

Example:

```Rust
#[derive(Copy, Drop)]
struct A {
    item: felt252
}

fn main() {
    let first_struct = A {
        item: 2
    };
    let second_struct = first_struct;
    assert(second_struct.item == 2, 'Not equal');
    assert(first_struct.item == 2, 'Not Equal'); // Copy Trait prevents firs_struct from moving into second_struct
}
```

## Serializing with Serde

`Serde` provides trait implementations for `serialize` and `deserialize` functions for data structures defined in your crate. It allows you to transform your structure into an array (or the opposite).

Example:

```Rust
use serde::Serde;
use array::ArrayTrait;

#[derive(Serde, Drop)]
struct A {
    item_one: felt252,
    item_two: felt252,
}

fn main() {
    let first_struct = A {
        item_one: 2,
        item_two: 99,
    };
    let mut output_array = ArrayTrait::new();
    let serialized = first_struct.serialize(ref output_array);
    panic(output_array);
}
```

Output:

```Bash
Run panicked with [2 (''), 99 ('c'), ].
```

We can see here that our struct A has been serialized into the output array.

Also, we can use `deserialize` function to convert the serialized array back into our A struct.

Example:

```Rust
use serde::Serde;
use array::ArrayTrait;
use option::OptionTrait;

#[derive(Serde, Drop)]
struct A {
    item_one: felt252,
    item_two: felt252,
}

fn main() {
    let first_struct = A {
        item_one: 2,
        item_two: 99,
    };
    let mut output_array = ArrayTrait::new();
    let mut serialized = first_struct.serialize(ref output_array);
    let mut span_array = output_array.span();
    let deserialized_struct: A = Serde::<A>::deserialize(ref span_array).unwrap();
}
```

Here we are converting a serialized array span back to the struct A. `deserialize` returns an `Option` so we need to unwrap it. When using deserialize we also need to specify the type we want to deserialize into.

## Drop and Destruct

When moving out of scope, variables need to be moved first. This is where the `Drop` trait intervenes. You can find more details about its usage [here](ch03-01-what-is-ownership.md#the-drop-trait).

Moreover Dictionary need to be squashed before going out of scope. Calling manually the `squash` method on each of them can be quickly redundant. `Destruct` trait allows Dictionaries to be automatically squashed when they get out of scope. You can also find more information about `Destruct` [here](ch03-01-what-is-ownership.md#the-destruct-trait).

## PartialOrd and Ord for Ordering Comparisons

TODO (Not derivable yet ?)
