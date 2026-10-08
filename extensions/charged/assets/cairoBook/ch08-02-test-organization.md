# Testing Organization

We'll think about tests in terms of two main categories: unit tests and integration tests. Unit tests are small and more focused, testing one module in isolation at a time, and can test private functions. Integration tests use your code in the same way any other external code would, using only the public interface and potentially exercising multiple modules per test.

Writing both kinds of tests is important to ensure that the pieces of your library are doing what you expect them to, separately and together.

## Unit Tests

The purpose of unit tests is to test each unit of code in isolation from the rest of the code to quickly pinpoint where code is and isn’t working as expected. You’ll put unit tests in the `src` directory in each file with the code that they’re testing.

The convention is to create a module named tests in each file to contain the test functions and to annotate the module with `cfg(test)`.

### The Tests Module and `#[cfg(test)]`

The `#[cfg(test)]` annotation on the tests module tells Cairo to compile and run the test code only when you run `cairo-test`, not when you run `cairo-run`. This saves compile time when you only want to build the library and saves space in the resulting compiled artifact because the tests are not included. You’ll see that because integration tests go in a different directory, they don’t need the `#[cfg(test)]` annotation. However, because unit tests go in the same files as the code, you’ll use `#[cfg(test)]` to specify that they shouldn’t be included in the compiled result.

Recall that when we created the new `adder` project in the first section of this chapter, we wrote this first test:

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

The attribute `cfg` stands for configuration and tells Cairo that the following item should only be included given a certain configuration option. In this case, the configuration option is `test`, which is provided by Cairo for compiling and running tests. By using the `cfg` attribute, Cairo compiles our test code only if we actively run the tests with `cairo-test`. This includes any helper functions that might be within this module, in addition to the functions annotated with `#[test]`.

## Integration Tests

Integration tests use your library in the same way any other code would. Their purpose is to test whether many parts of your library work together correctly. Units of code that work correctly on their own could have problems when integrated, so test coverage of the integrated code is important as well. To create integration tests, you first need a `tests` directory.

### The `tests` Directory

```shell
adder
├── cairo_project.toml
├── src
    ├── lib.cairo
│   └── main.cairo
└── tests
    ├── lib.cairo
    └── integration_test.cairo
```

<!-- TODO: remove when Scarb test work -->

> To successfully run your tests with `cairo-test` you will need to update your `cairo_project.toml` file to add the declaration of your `tests` crate.
>
> ```rust
> [crate_roots]
> adder = "src"
> tests = "tests"
> ```

Each test file is compiled as its own separate crate, that's why whenever you add a new test file you must add it to your _tests/lib.cairo_.

<span class="filename">Filename: tests/lib.cairo</span>

```rust
#[cfg(tests)]
mod integration_tests;
```

Enter the code in Listing 11-13 into the _tests/integration_test.cairo_ file:

<span class="filename">Filename: tests/integration_test.cairo</span>

```rust
use adder::main;

#[test]
fn internal() {
    assert(main::internal_adder(2_u32, 2_u32) == 4_u32, 'internal_adder failed');
}
```

Each file in the tests directory is a separate crate, so we need to bring our library into each test crate’s scope. For that reason we add `use adder::main` at the top of the code, which we didn’t need in the unit tests.

```shell
$ cairo-test tests/
running 1 tests
test tests::tests_integration::it_adds_two ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 filtered out;
```

The result of the tests is the same as what we've been seeing: one line for each test.
