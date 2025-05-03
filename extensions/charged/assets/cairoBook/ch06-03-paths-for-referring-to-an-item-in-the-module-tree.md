## Paths for Referring to an Item in the Module Tree

To show Cairo where to find an item in a module tree, we use a path in the same way we use a path when navigating a filesystem. To call a function, we need to know its path.

A path can take two forms:

- An _absolute path_ is the full path starting from a crate root. The absolute path begins with the crate name.
- A _relative path_ starts from the current module.

  Both absolute and relative paths are followed by one or more identifiers
  separated by double colons (`::`).

To illustrate this notion let's take back our example Listing 6-1 for the restaurant we used in the last chapter. We have a crate named `restaurant` in which we have a module named `front_of_house` that contains a module named `hosting`. The `hosting` module contains a function named `add_to_waitlist`. We want to call the `add_to_waitlist` function from the `eat_at_restaurant` function. We need to tell Cairo the path to the `add_to_waitlist` function so it can find it.

<span class="filename">Filename: src/lib.cairo</span>

```rust
mod front_of_house {
    mod hosting {
        fn add_to_waitlist() {}

        fn seat_at_table() {}
    }

    mod serving {
        fn take_order() {}

        fn serve_order() {}

        fn take_payment() {}
    }
}


pub fn eat_at_restaurant() {
    // Absolute path
    restaurant::front_of_house::hosting::add_to_waitlist(); // ✅ Compiles

    // Relative path
    front_of_house::hosting::add_to_waitlist(); // ✅ Compiles
}
```

<span class="caption">Listing 6-3: Calling the `add_to_waitlist` function using absolute and relative paths</span>

The first time we call the `add_to_waitlist` function in `eat_at_restaurant`,
we use an absolute path. The `add_to_waitlist` function is defined in the same
crate as `eat_at_restaurant`. In Cairo, absolute paths start from the crate root, which you need to refer to by using the crate name.

The second time we call `add_to_waitlist`, we use a relative path. The path starts with `front_of_house`, the name of the module
defined at the same level of the module tree as `eat_at_restaurant`. Here the
filesystem equivalent would be using the path
`./front_of_house/hosting/add_to_waitlist`. Starting with a module name means
that the path is relative to the current module.

### Starting Relative Paths with `super`

Choosing whether to use a `super` or not is a decision you’ll make
based on your project, and depends on whether you’re more likely to move item
definition code separately from or together with the code that uses the item.

<span class="filename">Filename: src/lib.cairo</span>

```rust
fn deliver_order() {}

mod back_of_house {
    fn fix_incorrect_order() {
        cook_order();
        super::deliver_order();
    }

    fn cook_order() {}
}
```

<span class="caption">Listing 6-4: Calling a function using a relative path starting with super</span>

Here you can see directly that you access a parent's module easily using `super`, which wasn't the case previously.
