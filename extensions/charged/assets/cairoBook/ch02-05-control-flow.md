## Control Flow

The ability to run some code depending on whether a condition is true and to run some code repeatedly while a condition is true are basic building blocks in most programming languages. The most common constructs that let you control the flow of execution of Cairo code are if expressions and loops.

### `if` Expressions

An if expression allows you to branch your code depending on conditions. You provide a condition and then state, “If this condition is met, run this block of code. If the condition is not met, do not run this block of code.”

<span class="filename">Filename: main.cairo</span>

```rust
use debug::PrintTrait;

fn main() {
    let number = 3;

    if number == 5 {
        'condition was true'.print();
    } else {
        'condition was false'.print();
    }
}
```

All `if` expressions start with the keyword `if`, followed by a condition. In this case, the condition checks whether or not the variable `number` has a value equal to 5. We place the block of code to execute if the condition is `true` immediately after the condition inside curly brackets.

Optionally, we can also include an `else` expression, which we chose to do here, to give the program an alternative block of code to execute should the condition evaluate to `false`. If you don’t provide an `else` expression and the condition is `false`, the program will just skip the `if` block and move on to the next bit of code.

Try running this code; you should see the following output:

```console
$ cairo-run main.cairo
[DEBUG]	condition was false
```

Let’s try changing the value of `number` to a value that makes the condition `true` to see what happens:

```rust
    let number = 5;
```

```console
$ cairo-run main.cairo
condition was true
```

It’s also worth noting that the condition in this code must be a bool. If the condition isn’t a bool, we’ll get an error.

```console
$ cairo-run main.cairo
thread 'main' panicked at 'Failed to specialize: `enum_match<felt252>`. Error: Could not specialize libfunc `enum_match` with generic_args: [Type(ConcreteTypeId { id: 1, debug_name: None })]. Error: Provided generic argument is unsupported.', crates/cairo-lang-sierra-generator/src/utils.rs:256:9
```

### Handling Multiple Conditions with `else if`

You can use multiple conditions by combining if and else in an else if expression. For example:

<span class="filename">Filename: main.cairo</span>

```rust
use debug::PrintTrait;

fn main() {
    let number = 3;

    if number == 12 {
        'number is 12'.print();
    } else if number == 3 {
        'number is 3'.print();
    } else if number - 2 == 1 {
        'number minus 2 is 1'.print();
    } else {
        'number not found'.print();
    }
}
```

This program has four possible paths it can take. After running it, you should see the following output:

```console
[DEBUG]	number is 3
```

When this program executes, it checks each `if` expression in turn and executes the first body for which the condition evaluates to `true`. Note that even though `number - 2 == 1` is `true`, we don’t see the output `number minus 2 is 1'.print()`, nor do we see the `number not found` text from the `else` block. That’s because Cairo only executes the block for the first true condition, and once it finds one, it doesn’t even check the rest. Using too many `else if` expressions can clutter your code, so if you have more than one, you might want to refactor your code. Chapter 5 describes a powerful Cairo branching construct called `match` for these cases.

### Using `if` in a `let` statement

Because if is an expression, we can use it on the right side of a let statement to assign the outcome to a variable.

<span class="filename">Filename: main.cairo</span>

```rust
use debug::PrintTrait;

fn main() {
    let condition = true;
    let number = if condition {
        5
    } else {
        6
    };

    if number == 5 {
        'condition was true'.print();
    }
}
```

```console
$ cairo-run main.cairo
[DEBUG]	condition was true
```

The `number` variable will be bound to a value based on the outcome of the `if` expression. Which will be 5 here.

### Repetition with Loops

It’s often useful to execute a block of code more than once. For this task, Cairo provides a simple loop syntax, which will run through the code inside the loop body to the end and then start immediately back at the beginning. To experiment with loops, let’s create a new project called loops.

Cairo only has one kind of loop for now: `loop`.

#### Repeating Code with `loop`

The `loop` keyword tells Cairo to execute a block of code over and over again
forever or until you explicitly tell it to stop.

As an example, change the _src/lib.rs_ file in your _loops_ directory to look
like this:

<span class="filename">Filename: src/lib.cairo</span>

```rust,ignore
use debug::PrintTrait;
fn main() {
    let mut i:usize = 0;
    loop {
        if i > 10{
            break();
        }
        'again!'.print();
    }
}
```

When we run this program, we’ll see `again!` printed over and over continuously
until we stop the program manually, because the stop condition is never reached.
While the compiler prevents us from writing programs without a stop condition (`break()` statement),
the stop condition might never be reached, resulting in an infinite loop.
Most terminals support the keyboard shortcut <span class="keystroke">ctrl-c</span> to interrupt a program that is
stuck in a continual loop. Give it a try:

```console
❯ cairo-run src/lib.cairo --available-gas=20000000
[DEBUG]	again                          	(raw: 418346264942)

[DEBUG]	again                          	(raw: 418346264942)

[DEBUG]	again                          	(raw: 418346264942)

[DEBUG]	again                          	(raw: 418346264942)

Run panicked with err values: [375233589013918064796019]
Remaining gas: 1050
```

> Note: Cairo prevents us from running program with infinite loops by including a gas meter. The gas meter is a mechanism that limits the amount of computation that can be done in a program. By setting a value to the `--available-gas` flag, we can set the maximum amount of gas available to the program. Gas is a unit of measurements that expresses the computation cost of an instruction. When the gas meter runs out, the program will stop. In this case, the program panicked because it ran out of gas, as the stop condition was never reached.
> It is particularly important in the context of smart contracts deployed on Starknet, as it prevents from running infinite loops on the network.
> If you're writing a program that needs to run a loop, you will need to execute it with the `--available-gas` flag set to a value that is large enough to run the program.

To break out of a loop, you can place the `break()` statement within the loop to tell the program when to stop
executing the loop. Let's fix the infinite loop by adding a making the stop condition `i > 10` reachable.

```rust
use debug::PrintTrait;
fn main() {
    let mut i: usize = 0;
    loop {
        if i > 10 {
            break ();
        }
        'again'.print();
        i += 1;
    }
}
```

#### Returning Values from Loops

One of the uses of a `loop` is to retry an operation you know might fail, such
as checking whether an operation has succeeded. You might also need to pass
the result of that operation out of the loop to the rest of your code. To do
this, you can add the value you want returned after the `break` expression you
use to stop the loop; that value will be returned out of the loop so you can
use it, as shown here:

```rust
use debug::PrintTrait;
fn main() {
    let mut counter = 0;

    let result = loop {
        if counter == 10 {
            break counter * 2;
        }
        counter += 1;
    };

    'The result is '.print();
    result.print();
}
```

Before the loop, we declare a variable named `counter` and initialize it to
`0`. Then we declare a variable named `result` to hold the value returned from
the loop. On every iteration of the loop, we check whether the `counter` is equal to `10`, and then add `1` to the `counter` variable.
When the condition is met, we use the `break` keyword with the value `counter * 2`. After the loop, we use a
semicolon to end the statement that assigns the value to `result`. Finally, we
print the value in `result`, which in this case is `20`.
