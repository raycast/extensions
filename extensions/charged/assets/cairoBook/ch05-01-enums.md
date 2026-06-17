# Enums

Enums, short for "enumerations," are a way to define a custom data type that consists of a fixed set of named values, called _variants_. Enums are useful for representing a collection of related values where each value is distinct and has a specific meaning.

## Enum Variants and Values

Here's a simple example of an enum:

```rs
#[derive(Drop)]
enum Direction {
    North: (),
    East: (),
    South: (),
    West: (),
}

```

Unlike other languages like Rust, every variant has a type. In this example, we've defined an enum called `Direction` with four variants: `North`, `East`, `South`, and `West`. The naming convention is to use PascalCase for enum variants. Each variant represents a distinct value of the Direction type and is associated with a unit type `()`. One variant can be instantiated using this syntax:

```rs
let direction = Direction::North(());
```

It's easy to write code that acts differently depending on the variant of an enum instance, in this example to run specific code according to a Direction. You can learn more about it on the [The Match Control Flow Construct page](ch05-02-the-match-control-flow-construct.md).

## Enums Combined with Custom Types

Enums can also be used to store more interesting data associated with each variant. For example:

```rs
#[derive(Drop)]
enum Message {
    Quit : (),
    Echo : felt252,
    Move : (u128, u128),
}
```

In this example, the `Message` enum has three variants: `Quit`, `Echo` and `Move`, all with different types:

- `Quit` is the unit type - it has no data associated with it at all.
- `Echo` is a single felt.
- `Move` is a tuple of two u128 values.

You could even use a Struct or another Enum you defined inside one of your Enum variants.

## Trait Implementations for Enums

In Cairo, you can define traits and implement them for your custom enums. This allows you to define methods and behaviors associated with the enum. Here's an example of defining a trait and implementing it for the previous `Message` enum:

```rs
trait Processing {
    fn process(self: Message);
}

impl ProcessingImpl of Processing {
    fn process(self: Message) {
        match self {
            Message::Quit(()) => {
                'quitting'.print();
            },
            Message::Echo(value) => {
                value.print();
            },
            Message::Move((x, y)) => {
                'moving'.print();
            },
        }
    }
}
```

In this example, we implemented the `Processing` trait for `Message`. Here is how it could be used to process a Quit message:

```rust
let msg: Message = Message::Quit(());
msg.process();
```

Running this code would print `quitting`.

## The Option Enum and Its Advantages

The Option enum is a standard Cairo enum that represents the concept of an optional value. It has two variants: `Some: T` and `None: ()`. `Some: T ` indicates that there's a value of type `T`, while `None` represents the absence of a value.

```rs
enum Option<T> {
    Some: T,
    None: (),
}
```

The `Option` enum is helpful because it allows you to explicitly represent the possibility of a value being absent, making your code more expressive and easier to reason about. Using `Option` can also help prevent bugs caused by using uninitialized or unexpected `null` values.

To give you an example, here is a function which returns the index of the first element of an array with a given value, or None if the element is not present.

We are demonstrating two approaches for the above function:

- Recursive Approach `find_value_recursive`
- Iterative Approach `find_value_iterative`

> Note: in the future it would be nice to replace this example by something simpler using a loop and without gas related code.

```rust
use array::ArrayTrait;
use debug::PrintTrait;
fn find_value_recursive(arr: @Array<felt252>, value: felt252, index: usize) -> Option<usize> {
    match gas::withdraw_gas() {
        Option::Some(_) => {},
        Option::None(_) => {
            let mut data = ArrayTrait::new();
            data.append('OOG');
            panic(data);
        },
    }

    if index >= arr.len() {
        return Option::None(());
    }

    if *arr.at(index) == value {
        return Option::Some(index);
    }

    find_value_recursive(arr, value, index + 1_usize)
}

fn find_value_iterative(arr: @Array<felt252>, value: felt252) -> Option<usize> {
    let length = arr.len();
    let mut index = 0_usize;
    let mut found: Option<usize> = Option::None(());
    loop {
        if index < length {
            if *arr.at(index) == value {
                found = Option::Some(index);
                break ();
            }
        } else {
            break ();
        }
        index += 1_usize;
    };
    return found;
}

#[test]
#[available_gas(999999)]
fn test_increase_amount() {
    let mut my_array = ArrayTrait::new();
    my_array.append(3);
    my_array.append(7);
    my_array.append(2);
    my_array.append(5);

    let value_to_find = 7;
    let result = find_value_recursive(@my_array, value_to_find, 0_usize);
    let result_i = find_value_iterative(@my_array, value_to_find);


    match result {
        Option::Some(index) => {
            if index == 1_usize {
                'it worked'.print();
            }
        },
        Option::None(()) => {
            'not found'.print();
        },
    }
    match result_i {
        Option::Some(index) => {
            if index == 1_usize {
                'it worked'.print();
            }
        },
        Option::None(()) => {
            'not found'.print();
        },
    }
}

```

Running this code would print `it worked`.
