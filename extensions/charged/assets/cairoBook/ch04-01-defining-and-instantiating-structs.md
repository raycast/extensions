# Defining and Instantiating Structs

Structs are similar to tuples, discussed in [The Data Types](ch02-02-data-types.md) section, in that both hold multiple related values. Like tuples, the pieces of a struct can be different types. Unlike with tuples, in a struct you’ll name each piece of data so it’s clear what the values mean. Adding these names means that structs are more flexible than tuples: you don’t have to rely on the order of the data to specify or access the values of an instance.

To define a struct, we enter the keyword `struct` and name the entire struct. A struct’s name should describe the significance of the pieces of data being grouped together. Then, inside curly brackets, we define the names and types of the pieces of data, which we call fields. For example, Listing 4-1 shows a struct that stores information about a user account.

<span class="filename">Filename: structs.cairo</span>

```rust
#[derive(Copy, Drop)]
struct User {
    active: bool,
    username: felt252,
    email: felt252,
    sign_in_count: u64,
}
```

<span class="caption">Listing 4-1: A `User` struct definition</span>

To use a struct after we’ve defined it, we create an _instance_ of that struct by specifying concrete values for each of the fields.
We create an instance by stating the name of the struct and then add curly brackets containing _key: value_ pairs, where the keys are the names of the fields and the values are the data we want to store in those fields. We don’t have to specify the fields in the same order in which we declared them in the struct. In other words, the struct definition is like a general template for the type, and instances fill in that template with particular data to create values of the type.

For example, we can declare a particular user as shown in Listing 4-2.

<span class="filename">Filename: structs.cairo</span>

```rust
#[derive(Copy, Drop)]
struct User {
    active: bool,
    username: felt252,
    email: felt252,
    sign_in_count: u64,
}
fn main() {
    let user1 = User {
        active: true,
        username: 'someusername123',
        email: 'someone@example.com',
        sign_in_count: 1_u64,
    };
}
```

<span class="caption">Listing 4-2: Creating an instance of the `User` struct</span>

To get a specific value from a struct, we use dot notation. For example, to access this user’s email address, we use `user1.email`. If the instance is mutable, we can change a value by using the dot notation and assigning into a particular field. Listing 4-3 shows how to change the value in the `email` field of a mutable `User` instance.

<span class="filename">Filename: structs.cairo</span>

```rust
fn main() {
    let mut user1 = User {
        active: true,
        username: 'someusername123',
        email: 'someone@example.com',
        sign_in_count: 1_u64,
    };
    user1.email = 'anotheremail@example.com';
}
```

<span class="caption">Listing 4-3: Changing the value in the email field of a `User` instance</span>

Note that the entire instance must be mutable; Cairo doesn’t allow us to mark only certain fields as mutable.

As with any expression, we can construct a new instance of the struct as the last expression in the function body to implicitly return that new instance.

Listing 4-4 shows a `build_user` function that returns a `User` instance with the given email and username. The `active` field gets the value of `true`, and the `sign_in_count` gets a value of `1`.

<span class="filename">Filename: structs.cairo</span>

```rust
fn build_user(email: felt252, username: felt252) -> User {
    User {
        active: true,
        username: username,
        email: email,
        sign_in_count: 1,
    }
}
```

<span class="caption">Listing 4-4: A `build_user` function that takes an email and username and returns a `User` instance</span>

It makes sense to name the function parameters with the same name as the struct fields, but having to repeat the `email` and `username` field names and variables is a bit tedious. If the struct had more fields, repeating each name would get even more annoying. Luckily, there’s a convenient shorthand!

## Using the Field Init Shorthand

Because the parameter names and the struct field names are exactly the same in Listing 4-4, we can use the field init shorthand syntax to rewrite `build_user` so it behaves exactly the same but doesn’t have the repetition of `username` and `email`, as shown in Listing 4-5.

<span class="filename">Filename: structs.cairo</span>

```rust
fn build_user(email: felt252, username: felt252) -> User {
    User {
        active: true,
        username,
        email,
        sign_in_count: 1_u64,
    }
}
```

<span class="caption">Listing 4-5: A `build_user` function that uses field init shorthand because the `username` and `email` parameters have the same name as struct fields</span>

Here, we’re creating a new instance of the `User` struct, which has a field named `email`. We want to set the `email` field’s value to the value in the `email` parameter of the `build_user` function. Because the `email` field and the `email` parameter have the same name, we only need to write `email` rather than `email: email`.
