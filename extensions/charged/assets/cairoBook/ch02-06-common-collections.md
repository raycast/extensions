## Common Collections

Cairo1 provides a set of common collection types that can be used to store and manipulate data. These collections are designed to be efficient, flexible, and easy to use. This section introduces the primary collection types available in Cairo1: `Array` and `Felt252Dict` (coming soon).

### Array

An array is a collection of elements of the same type. You can create and use array methods by importing the `array::ArrayTrait` trait.

An important thing to note is that arrays have limited modifications options. Arrays are, in fact, queues whose values can't be modified.
This has to do with the fact that once a memory slot is written to, it cannot be overwritten, but only read from it. You can only append items to the end of an array and remove items from the front using `pop_front`.

#### Creating an Array

Creating an Array is done with the `ArrayTrait::new()` call. Here is an example of creation of an array with 3 elements:

```rust
use array::ArrayTrait;

fn main() {
    let mut a = ArrayTrait::new();
    a.append(0);
    a.append(1);
    a.append(2);
}
```

You can pass the expected type of items inside the array when instantiating the array like this

```rust,
let mut arr = ArrayTrait::<u128>::new();
```

#### Updating an Array

##### Adding Elements

To add an element to the end of an array, you can use the `append()` method:

```rust
    let mut a = ArrayTrait::new();
    a.append(10);
    a.append(1);
    a.append(2);
```

##### Removing Elements

To remove an element from the front of an array, you can use the `pop_front()` method.
This method returns an `Option` containing the removed element, or `Option::None` if the array is empty.

```rust
use option::OptionTrait;
use array::ArrayTrait;
use debug::PrintTrait;

fn main() {
    let mut a = ArrayTrait::new();
    a.append(10);
    a.append(1);
    a.append(2);

    let first_value = a.pop_front().unwrap();
    first_value.print(); // print '10'
}
```

The above code will print `10` as we remove the first element that was added.

In Cairo, memory is immutable, which means that it is not possible to modify the elements of an array once they've been added. You can only add elements to the end of an array and remove elements from the front of an array. These operations do not require memory mutation, as they involve updating pointers rather than directly modifying the memory cells.

#### Reading Elements from an Array

To access array elements, you can use `get()` or `at()` array methods that return different types. Using `arr.at(index)` is equivalent to using the subscripting operator `arr[index]`.

The `get` function returns an `Option<Box<@T>>`, which means it returns an option to a Box type (Cairo's smart-pointer type) containing a snapshot to the element at the specified index if that element exists in the array. If the element doesn't exist, `get` returns `None`. This method is useful when you expect to access indices that may not be within the array's bounds and want to handle such cases gracefully without panics. Snapshots will be explained in more detail in the [References and Snapshots](ch03-02-references-and-snapshots.md) chapter.

The `at` function, on the other hand, directly returns a snapshot to the element at the specified index using the `unbox()` operator to extract the value stored in a box. If the index is out of bounds, a panic error occurs. You should only use at when you want the program to panic if the provided index is out of the array's bounds, which can prevent unexpected behavior.

In summary, use `at` when you want to panic on out-of-bounds access attempts, and use `get` when you prefer to handle such cases gracefully without panicking.

```rust
use array::ArrayTrait;
fn main() {
    let mut a = ArrayTrait::new();
    a.append(0);
    a.append(1);

    let first = *a.at(0_usize);
    let second = *a.at(1_usize);
}
```

In this example, the variable named `first` will get the value `0` because that
is the value at index `0` in the array. The variable named `second` will get
the value `1` from index `1` in the array.

Here is an example with the `get()` method:

```rust
use array::ArrayTrait;
use box::BoxTrait;
fn main() -> u128 {
    let mut arr = ArrayTrait::<u128>::new();
    arr.append(100_u128);
    let index_to_access =
        1_usize;        // Change this value to see different results, what would happen if the index doesn't exist ?
    match arr.get(index_to_access) {
        Option::Some(x) => {
            *x.unbox()  // Don't worry about * for now, if you are curious see Chapter 3.2 #desnap operator
                        // It basically means "transform what get(idx) returned into a real value"
        },
        Option::None(_) => {
            let mut data = ArrayTrait::new();
            data.append('out of bounds');
            panic(data)
        }
    }
}
```

#### Size related methods

To determine the number of elements in an array, use the `len()` method. The return is of type `usize`.

If you want to check if an array is empty or not, you can use the `is_empty()` method, which returns `true` if the array is empty and `false` otherwise.

#### Storing multiple types with Enums

If you want to store elements of different types in an array, you can use an `Enum` to define a custom data type that can hold multiple types.

```rust
use array::ArrayTrait;
use traits::Into;

#[derive(Copy, Drop)]
enum Data {
    Integer: u128,
    Felt: felt252,
    Tuple: (u32, u32),
}

fn main() {
    let mut messages: Array<Data> = ArrayTrait::new();
    messages.append(Data::Integer(100_u128));
    messages.append(Data::Felt('hello world'));
    messages.append(Data::Tuple((10_u32, 30_u32)));
}
```

#### Span

`Span` is a struct that represents a snapshot of an `Array`. It is designed to provide safe and controlled access to the elements of an array without modifying the original array. Span is particularly useful for ensuring data integrity and avoiding borrowing issues when passing arrays between functions or when performing read-only operations (cf. [References and Snapshots](ch03-02-references-and-snapshots.md))

All methods provided by `Array` can also be used with `Span`, with the exception of the `append()` method.

##### Turning an Array into span

To create a `Span` of an `Array`, call the `span()` method:

```rust
let span = array.span();
```

## Summary

You made it! This was a sizable chapter: you learned about variables, data types, functions, comments,
`if` expressions, loops, and common collections! To practice with the concepts discussed in this chapter,
try building programs to do the following:

- Generate the _n_-th Fibonacci number.
- Compute the factorial of a number _n_.

When you’re ready to move on, we’ll talk about a concept that Cairo shares with Rust and that _doesn’t_
commonly exist in other programming languages: ownership.
