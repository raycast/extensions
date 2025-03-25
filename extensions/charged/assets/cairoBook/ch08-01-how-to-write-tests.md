# How To Write Tests

## The Anatomy of a Test Function

Tests are Cairo functions that verify that the non-test code is functioning in the expected manner. The bodies of test functions typically perform these three actions:

- Set up any needed data or state.
- Run the code you want to test.
- Assert the results are what you expect.

Let’s look at the features Cairo provides specifically for writing tests that take these actions, which include the `test` attribute, the `assert` function, and and the `should_panic` attribute.

### The Anatomy of a Test Function

At its simplest, a test in Cairo is a function that’s annotated with the `test` attribute. Attributes are metadata about pieces of Cairo code; one example is the derive attribute we used with structs in Chapter 4. To change a function into a test function, add `#[test]` on the line before `fn`. When you run your tests with the `cairo-test` command, Cairo builds a test runner binary that runs the annotated functions and reports on whether each test function passes or fails.

Let's create a new project called `adder` that will add two numbers using Scarb with the command `scarb new adder`:

```shell
adder
├── cairo_project.toml
├── Scarb.toml
└── src
    └── lib.cairo
```

<!-- TODO: remove when Scarb test work -->

> Note: You will notice here a `cairo_project.toml` file.
> This is the configuration file for "vanilla" Cairo projects (i.e. not managed by Scarb),
> which is required to run the `cairo-test .` command to run the code of the crate.
> It is required until Scarb implements this feature. The content of the file is:
>
> ```toml
> [crate_roots]
> adder = "src"
> ```
>
> and indicates that the crate named "adder" is located in the `src` directory.

In _lib.cairo_, let's add a first test, as shown in Listing 8-1.

<span class="filename">Filename: lib.cairo</span>

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert(result == 4, 'result is not 4');
    }
}
```

Listing 8-1: A test module and function

For now, let’s ignore the top two lines and focus on the function. Note the `#[test]` annotation: this attribute indicates this is a test function, so the test runner knows to treat this function as a test. We might also have non-test functions in the tests module to help set up common scenarios or perform common operations, so we always need to indicate which functions are tests.

The example function body uses the `assert` function, which contains the result of adding 2 and 2, equals 4. This assertion serves as an example of the format for a typical test. Let’s run it to see that this test passes.

The `cairo-test .` command runs all tests in our project, as shown in Listing 8-2.

```shell
$ cairo-test .
running 1 tests
test adder::lib::tests::it_works ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 filtered out;
```

Listing 8-2: The output from running a test

`cairo-test` compiled and ran the test. We see the line `running 1 tests`. The next line shows the name of the generated test function, called `it_works`, and that the result of running that test is `ok`. The overall summary `test result: ok.` means that all the tests passed, and the portion that reads `1 passed; 0 failed` totals the number of tests that passed or failed.

It’s possible to mark a test as ignored so it doesn’t run in a particular instance; we’ll cover that in the [Ignoring Some Tests Unless Specifically Requested](#ignoring-some-tests-unless-specifically-requested) section later in this chapter. Because we haven’t done that here, the summary shows `0 ignored`. We can also pass an argument to the `cairo-test` command to run only a test whose name matches a string; this is called filtering and we’ll cover that in the [Running Single Tests](#running-single-tests) section. We also haven’t filtered the tests being run, so the end of the summary shows `0 filtered out`.

Let’s start to customize the test to our own needs. First change the name of the `it_works` function to a different name, such as `exploration`, like so:

<span class="filename">Filename: lib.cairo</span>

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn exploration() {
        let result = 2 + 2;
        assert(result == 4, 'result is not 4');
    }
}
```

Then run `cairo-test  -- --path src` again. The output now shows `exploration` instead of `it_works`:

```shell
$ cairo-test .
running 1 tests
test adder::lib::tests::exploration ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 filtered out;
```

Now we’ll add another test, but this time we’ll make a test that fails! Tests fail when something in the test function panics. Each test is run in a new thread, and when the main thread sees that a test thread has died, the test is marked as failed. Enter the new test as a function named `another`, so your _src/lib.cairo_ file looks like Listing 8-3.

```rust
#[cfg(test)]
mod tests{
    #[test]
    fn another() {
        let result = 2 + 2;
        assert(result == 6, 'Make this test fail');
    }
}
```

Listing 8-3: Adding a second test that will fail

```shell
$ cairo-test .
running 2 tests
test adder::lib::tests::exploration ... ok
test adder::lib::tests::another ... fail
failures:
    adder::lib::tests::another - panicked with [1725643816656041371866211894343434536761780588 ('Make this test fail'), ].
Error: test result: FAILED. 1 passed; 1 failed; 0 ignored
```

Listing 8-4: Test results when one test passes and one test fails

Instead of `ok`, the line `adder::lib::tests::another` shows `fail`. A new section appears between the individual results and the summary. It displays the detailed reason for each test failure. In this case, we get the details that `another` failed because it panicked with `[1725643816656041371866211894343434536761780588 ('Make this test fail'), ]` in the _src/lib.cairo_ file.

The summary line displays at the end: overall, our test result is `FAILED`. We had one test pass and one test fail.

Now that you’ve seen what the test results look like in different scenarios, let’s look at some functions that are useful in tests.

## Checking Results with the assert function

The `assert` function, provided by Cairo, is useful when you want to ensure that some condition in a test evaluates to `true`. We give the `assert` function a first argument that evaluates to a Boolean. If the value is `true`, nothing happens and the test passes. If the value is `false`, the assert function calls `panic()` to cause the test to fail with a message we defined as the second argument of the `assert` function. Using the `assert` function helps us check that our code is functioning in the way we intend.

In [Chapter 4, Listing 5-15](ch04-03-method-syntax.md#multiple-impl-blocks), we used a `Rectangle` struct and a `can_hold` method, which are repeated here in Listing 8-5. Let’s put this code in the _src/lib.cairo_ file, then write some tests for it using the `assert` function.

<span class="filename">Filename: lib.cairo</span>

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

Listing 8-5: Using the `Rectangle` struct and its `can_hold` method from Chapter 5

The `can_hold` method returns a `Boolean`, which means it’s a perfect use case for the assert function. In Listing 8-6, we write a test that exercises the `can_hold` method by creating a `Rectangle` instance that has a width of `8_u64` and a height of `7_u64` and asserting that it can hold another `Rectangle` instance that has a width of `5_u64` and a height of `1_u64`.

<span class="filename">Filename: lib.cairo</span>

```rust
#[cfg(test)]
mod tests {
    use super::Rectangle;
    use super::RectangleTrait;

    #[test]
    fn larger_can_hold_smaller() {
        let larger = Rectangle {
            height: 7_u64,
            width: 8_u64,
        };
        let smaller = Rectangle {
            height: 1_u64,
            width: 5_u64,
        };

        assert(larger.can_hold(@smaller), 'rectangle cannot hold');
    }
}
```

Listing 8-6: A test for `can_hold` that checks whether a larger rectangle can indeed hold a smaller rectangle

Note that we’ve added two new lines inside the tests module: `use super::Rectangle;` and `use super::RectangleTrait;`. The tests module is a regular module that follows the usual visibility rules. Because the tests module is an inner module, we need to bring the code under test in the outer module into the scope of the inner module.

We’ve named our test `larger_can_hold_smaller`, and we’ve created the two `Rectangle` instances that we need. Then we called the assert function and passed it the result of calling `larger.can_hold(@smaller)`. This expression is supposed to return `true`, so our test should pass. Let’s find out!

```shell
$ cairo-test .
running 1 tests
test adder::lib::tests::larger_can_hold_smaller ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 filtered out;
```

It does pass! Let’s add another test, this time asserting that a smaller rectangle cannot hold a larger rectangle:

<span class="filename">Filename: lib.cairo</span>

```rust
#[cfg(test)]
mod tests {
    use super::Rectangle;
    use super::RectangleTrait;

    #[test]
    fn larger_can_hold_smaller() {
        // --snip--
    }

    #[test]
    fn smaller_cannot_hold_larger() {
        let larger = Rectangle {
            height: 7_u64,
            width: 8_u64,
        };
        let smaller = Rectangle {
            height: 1_u64,
            width: 5_u64,
        };

        assert(!smaller.can_hold(@larger), 'rectangle cannot hold');
    }
}
```

Because the correct result of the `can_hold` function in this case is `false`, we need to negate that result before we pass it to the assert function. As a result, our test will pass if `can_hold` returns false:

```shell
$ cairo-test .
    running 2 tests
    test adder::lib::tests::smaller_cannot_hold_larger ... ok
    test adder::lib::tests::larger_can_hold_smaller ... ok
    test result: ok. 2 passed; 0 failed; 0 ignored; 0 filtered out;
```

Two tests that pass! Now let’s see what happens to our test results when we introduce a bug in our code. We’ll change the implementation of the `can_hold` method by replacing the greater-than sign with a less-than sign when it compares the widths:

```rust
// --snip--
impl RectangleImpl of RectangleTrait {
    fn can_hold(self: @Rectangle, other: @Rectangle) -> bool {
        *self.width < *other.width & *self.height > *other.height
    }
}
```

Running the tests now produces the following:

```shell
$ cairo-test .
running 2 tests
test adder::lib::tests::smaller_cannot_hold_larger ... ok
test adder::lib::tests::larger_can_hold_smaller ... fail
failures:
   adder::lib::tests::larger_can_hold_smaller - panicked with [167190012635530104759003347567405866263038433127524 ('rectangle cannot hold'), ].

Error: test result: FAILED. 1 passed; 1 failed; 0 ignored
```

Our tests caught the bug! Because `larger.width` is `8_u64` and `smaller.width` is `5_u64`, the comparison of the widths in `can_hold` now returns `false`: `8_u64` is not less than `5_u64`.

## Checking for Panics with `should_panic`

In addition to checking return values, it’s important to check that our code handles error conditions as we expect. For example, consider the Guess type in Listing 8-8. Other code that uses `Guess` depends on the guarantee that `Guess` instances will contain only values between `1_u64` and `100_u64`. We can write a test that ensures that attempting to create a `Guess` instance with a value outside that range panics.

We do this by adding the attribute `should_panic` to our test function. The test passes if the code inside the function panics; the test fails if the code inside the function doesn’t panic.

Listing 8-8 shows a test that checks that the error conditions of `GuessTrait::new` happen when we expect them to.

<span class="filename">Filename: lib.cairo</span>

```rust
use array::ArrayTrait;

#[derive(Copy, Drop)]
struct Guess {
    value: u64,
}

trait GuessTrait {
    fn new(value: u64) -> Guess;
}

impl GuessImpl of GuessTrait {
    fn new(value: u64) -> Guess {
        if value < 1_u64 | value > 100 {
            let mut data = ArrayTrait::new();
            data.append('Guess must be >= 1 and <= 100');
            panic(data);
        }
        Guess { value }
    }
}

#[cfg(test)]
mod tests {
    use super::Guess;
    use super::GuessTrait;

    #[test]
    #[should_panic]
    fn greater_than_100() {
        GuessTrait::new(200_u64);
    }
}
```

Listing 8-8: Testing that a condition will cause a panic

We place the `#[should_panic]` attribute after the `#[test]` attribute and before the test function it applies to. Let’s look at the result when this test passes:

```shell
$ cairo-test .
running 1 tests
test adder::lib::tests::greater_than_100 ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 filtered out;
```

Looks good! Now let’s introduce a bug in our code by removing the condition that the new function will panic if the value is greater than `100_u64`:

```rust
// --snip--
impl GuessImpl of GuessTrait {
    fn new(value: u64) -> Guess {
        if value < 1_u64 {
            let mut data = ArrayTrait::new();
            data.append('Guess must be >= 1 and <= 100');
            panic(data);
        }

        Guess { value, }
    }
}
```

When we run the test in Listing 8-8, it will fail:

```shell
$ cairo-test .
running 1 tests
test adder::lib::tests::greater_than_100 ... fail
failures:
   adder::lib::tests::greater_than_100 - expected panic but finished successfully.
Error: test result: FAILED. 0 passed; 1 failed; 0 ignored
```

We don’t get a very helpful message in this case, but when we look at the test function, we see that it’s annotated with `#[should_panic]`. The failure we got means that the code in the test function did not cause a panic.

Tests that use `should_panic` can be imprecise. A `should_panic` test would pass even if the test panics for a different reason from the one we were expecting. To make `should_panic` tests more precise, we can add an optional expected parameter to the `should_panic` attribute. The test harness will make sure that the failure message contains the provided text. For example, consider the modified code for `Guess` in Listing 8-9 where the new function panics with different messages depending on whether the value is too small or too large.

<span class="filename">Filename: lib.cairo</span>

```rust
// --snip--
impl GuessImpl of GuessTrait {
    fn new(value: u64) -> Guess {
        if value < 1_u64 {
            let mut data = ArrayTrait::new();
            data.append('Guess must be >= 1');
            panic(data);
        } else if value > 100_u64 {
            let mut data = ArrayTrait::new();
            data.append('Guess must be <= 100');
            panic(data);
        }

        Guess { value, }
    }
}

#[cfg(test)]
mod tests {
    use super::Guess;
    use super::GuessTrait;

    #[test]
    #[should_panic(expected: ('Guess must be <= 100', ))]
    fn greater_than_100() {
        GuessTrait::new(200_u64);
    }
}
```

Listing 8-9: Testing for a panic with a panic message containing the error message string

This test will pass because the value we put in the `should_panic` attribute’s expected parameter is the array of string of the message that the `Guess::new` function panics with. We need to specify the entire panic message that we expect.

To see what happens when a `should_panic` test with an expected message fails, let’s again introduce a bug into our code by swapping the bodies of the if `value < 1_u64` and the else if `value > 100_u64` blocks:

```rust
if value < 1_u64 {
    let mut data = ArrayTrait::new();
    data.append('Guess must be <= 100');
    panic(data);
} else if value > 100_u64 {
    let mut data = ArrayTrait::new();
    data.append('Guess must be >= 1');
    panic(data);
}
```

This time when we run the `should_panic` test, it will fail:

```shell
$ cairo-test .
running 1 tests
test adder::lib::tests::greater_than_100 ... fail
failures:
   adder::lib::tests::greater_than_100 - panicked with [6224920189561486601619856539731839409791025 ('Guess must be >= 1'), ].

Error: test result: FAILED. 0 passed; 1 failed; 0 ignored
```

The failure message indicates that this test did indeed panic as we expected, but the panic message did not include the expected string. The panic message that we did get in this case was `Guess must be >= 1`. Now we can start figuring out where our bug is!

## Running Single Tests

Sometimes, running a full test suite can take a long time. If you’re working on code in a particular area, you might want to run only the tests pertaining to that code. You can choose which tests to run by passing `cairo-test` the name of the test you want to run as an argument.

To demonstrate how to run a single test, we’ll first create two tests functions, as shown in Listing 8-10, and choose which ones to run.

<span class="filename">Filename: src/lib.cairo</span>

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn add_two_and_two() {
        let result = 2 + 2;
        assert(result == 4, 'result is not 4');
    }

    #[test]
    fn add_three_and_two() {
        let result = 3 + 2;
        assert(result == 5, 'result is not 5');
    }
}
```

Listing 8-10: Two tests with two different names

We can pass the name of any test function to `cairo-test` to run only that test using the `-f` flag:

```shell
$ cairo-test . -f add_two_and_two
running 1 tests
test adder::lib::tests::add_two_and_two ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 1 filtered out;
```

Only the test with the name `add_two_and_two` ran; the other test didn’t match that name. The test output lets us know we had one more test that didn’t run by displaying 1 filtered out at the end.

We can also specify part of a test name, and any test whose name contains that value will be run.

## Ignoring Some Tests Unless Specifically Requested

Sometimes a few specific tests can be very time-consuming to execute, so you might want to exclude them during most runs of `cairo-test`. Rather than listing as arguments all tests you do want to run, you can instead annotate the time-consuming tests using the `ignore` attribute to exclude them, as shown here:

<span class="filename">Filename: src/lib.cairo</span>

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert(result == 4, 'result is not 4');
    }

    #[test]
    #[ignore]
    fn expensive_test() {
        // code that takes an hour to run
    }
}
```

After `#[test]` we add the `#[ignore]` line to the test we want to exclude. Now when we run our tests, `it_works` runs, but `expensive_test` doesn’t:

```shell
$ cairo-test .
running 2 tests
test adder::lib::tests::expensive_test ... ignored
test adder::lib::tests::it_works ... ok
test result: ok. 1 passed; 0 failed; 1 ignored; 0 filtered out;
```

The `expensive_test` function is listed as ignored.

When you’re at a point where it makes sense to check the results of the ignored tests and you have time to wait for the results, you can run `cairo-test --include-ignored` to run all tests whether they’re ignored or not.
