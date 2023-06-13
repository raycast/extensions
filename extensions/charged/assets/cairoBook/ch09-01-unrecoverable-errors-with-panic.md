# Unrecoverable Errors with panic

In Cairo, unexpected issues may arise during program execution, resulting in runtime errors. While the panic function from the core library doesn't provide a resolution for these errors, it does acknowledge their occurrence and terminates the program. There are two primary ways that a panic can be triggered in Cairo: inadvertently, through actions causing the code to panic (e.g., accessing an array beyond its bounds), or deliberately, by invoking the panic function.

When a panic occurs, it leads to an abrupt termination of the program. The `panic` function take an array as argument, which can be used to provide an error message and performs an unwind process where all variables are dropped and dictionaries squashed to ensure the soundness of the program to safely terminate the execution.

Here is how we can `panic` from inside a program and return the error code `2`:

<span class="filename">Filename: lib.cairo</span>

```rust
use array::ArrayTrait;
use debug::PrintTrait;

fn main() {
    let mut data = ArrayTrait::new();
    data.append(2);
    panic(data);
    'This line isn't reached'.print();
}
```

Running the program will produce the following output:

```console
$ cairo-run test.cairo
Run panicked with err values: [2]
```

As you can notice in the output, the print statement is never reached, as the program terminates after encountering the `panic` statement.

An alternative and more idiomatic approach to panic in Cairo would be to use the `panic_with_felt252` function. This function serves as an abstraction of the array-defining process and is often preferred due to its clearer and more concise expression of intent. By using `panic_with_felt252`, developers can panic in a one-liner by providing a felt252 error message as argument, making the code more readable and maintainable.

Let's consider an example:

```rust
fn main() {
    panic_with_felt252(2);
}
```

Executing this program will yield the same error message as before. In that case, if there is no need for an array and multiple values to be returned within the error, so `panic_with_felt252` is a more succinct alternative.

## nopanic notation

You can use the `nopanic` notation to indicate that a function will never panic. Only `nopanic` functions can be called in a function annotated as `nopanic`.

Example:

```rust
fn function_never_panic() -> felt252 nopanic {
    42
}
```

Wrong example:

```rust
fn function_never_panic() nopanic {
    assert(1 == 1, 'what');
}
```

If you write the following function that includes a function that may panic you will get the following error:

```bash
error: Function is declared as nopanic but calls a function that may panic.
 --> test.cairo:2:12
    assert(1 == 1, 'what');
           ^****^
Function is declared as nopanic but calls a function that may panic.
 --> test.cairo:2:5
    assert(1 == 1, 'what');
    ^********************^
```

Note that there are two functions that may panic here, assert and equality.

## panic_with macro

You can use the `panic_with` macro to mark a function that returns an `Option` or `Result`. This macro takes two arguments, which are the data that is passed as the panic reason as well as the name for a wrapping function. It will create a wrapper for your annotated function which will panic if the function returns `None` or `Err`, the panic function will be called with the given data.

Example:

```rust
use option::OptionTrait;

#[panic_with('value is 0', wrap_not_zero)]
fn wrap_if_not_zero(value: u128) -> Option<u128> {
    if value == 0 {
        Option::None(())
    } else {
        Option::Some(value)
    }
}

fn main() {
    wrap_if_not_zero(0); // this returns None
    wrap_not_zero(0); // this panic with 'value is 0'
}
```

## Using assert

The assert function from the Cairo core library is actually a utility function based on panics. It asserts that a boolean expression is true at runtime, and if it is not, it calls the panic function with an error value. The assert function takes two arguments: the boolean expression to verify, and the error value. The error value is specified as a felt252, so any string passed must be able to fit inside a felt252.

Here is an example of its usage:

```rust
fn main() {
    let my_number: u8 = 0;

    assert(my_number != 0, 'number is zero');

    100 / my_number;
}
```

We are asserting in main that `my_number` is not zero to ensure that we're not performing a division by 0.
In this example, `my_number` is zero so the assertion will fail, and the program will panic
with the string 'number is zero' (as a felt252) and the division will not be reached.
