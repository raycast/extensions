# An Example Program Using Structs

To understand when we might want to use structs, let’s write a program that calculates the area of a rectangle. We’ll start by using single variables, and then refactor the program until we’re using structs instead.

Let’s make a new project with Scarb called _rectangles_ that will take the width and height of a rectangle specified in pixels and calculate the area of the rectangle. Listing 4-6 shows a short program with one way of doing exactly that in our project’s _src/lib.cairo_.

<span class="filename">Filename: src/lib.cairo</span>

```rust
use debug::PrintTrait;
fn main() {
    let width1 = 30_u64;
    let height1 = 10_u64;
    let area = area(width1, height1);
    area.print();
}

fn area(width: u64, height: u64) -> u64 {
    width * height
}
```

<span class="caption">Listing 4-6: Calculating the area of a rectangle specified by separate width and height variables</span>

Now run the program with `cairo-run src/lib.cairo`:

```bash
$ cairo-run src/lib.cairo
[DEBUG] ,                               (raw: 300)

Run completed successfully, returning []
```

This code succeeds in figuring out the area of the rectangle by calling the `area` function with each dimension, but we can do more to make this code clear and readable.

The issue with this code is evident in the signature of `area`:

```rust
fn area(width: u64, height: u64) -> u64 {
```

The `area` function is supposed to calculate the area of one rectangle, but the function we wrote has two parameters, and it’s not clear anywhere in our program that the parameters are related. It would be more readable and more manageable to group width and height together. We’ve already discussed one way we might do that in [Chapter 3](ch02-02-data-types.html#the-tuple-type): using tuples.

## Refactoring with Tuples

Listing 4-7 shows another version of our program that uses tuples.

<span class="filename">Filename: src/lib.cairo</span>

```rust
use debug::PrintTrait;
fn main() {
    let rectangle = (30_u64, 10_u64);
    let area = area(rectangle);
    area.print(); // print out the area
}

fn area(dimension: (u64, u64)) -> u64 {
    let (x,y) = dimension;
    x * y
}
```

<span class="caption">Listing 4-7: Specifying the width and height of the rectangle with a tuple</span>

In one way, this program is better. Tuples let us add a bit of structure, and we’re now passing just one argument. But in another way, this version is less clear: tuples don’t name their elements, so we have to index into the parts of the tuple, making our calculation less obvious.

Mixing up the width and height wouldn’t matter for the area calculation, but if we want to calculate the difference, it would matter! We would have to keep in mind that `width` is the tuple index `0` and `height` is the tuple index `1`. This would be even harder for someone else to figure out and keep in mind if they were to use our code. Because we haven’t conveyed the meaning of our data in our code, it’s now easier to introduce errors.

## Refactoring with Structs: Adding More Meaning

We use structs to add meaning by labeling the data. We can transform the tuple we’re using into a struct with a name for the whole as well as names for the parts.

<span class="filename">Filename: src/lib.cairo</span>

```rust
use debug::PrintTrait;

struct Rectangle {
    width: u64,
    height: u64,
}

fn main() {
    let rectangle = Rectangle {
        width: 30_u64,
        height: 10_u64,
    };
    let area = area(rectangle);
    area.print(); // print out the area
}

fn area(rectangle: Rectangle) -> u64 {
    rectangle.width * rectangle.height
}
```

<span class="caption">Listing 4-8: Defining a `Rectangle` struct</span>

Here we’ve defined a struct and named it `Rectangle`. Inside the curly brackets, we defined the fields as `width` and `height`, both of which have type `u64`. Then, in `main`, we created a particular instance of `Rectangle` that has a width of `30` and a height of `10`. Our `area` function is now defined with one parameter, which we’ve named `rectangle` which is of type `Rectangle` struct. We can then access the fields of the instance with dot notation, and it gives descriptive names to the values rather than using the tuple index values of `0` and `1`.

## Adding Useful Functionality with Trait

It’d be useful to be able to print an instance of `Rectangle` while we’re debugging our program and see the values for all its fields. Listing 4-9 tries using the `print` as we have used in previous chapters. This won’t work.

<span class="filename">Filename: src/lib.cairo</span>

```rust
use debug::PrintTrait;

struct Rectangle {
    width: u64,
    height: u64,
}

fn main() {
    let rectangle = Rectangle {
        width: 30_u64,
        height: 10_u64,
    };
    rectangle.print();
}
```

<span class="caption">Listing 4-9: Attempting to print a `Rectangle` instance</span>

When we compile this code, we get an error with this message:

```bash
$ cairo-compile src/lib.cairo
error: Method `print` not found on type "../src::Rectangle". Did you import the correct trait and impl?
 --> lib.cairo:16:15
    rectangle.print();
              ^***^

Error: Compilation failed.
```

The `print` trait is implemented for many data types, but not for the `Rectangle` struct. We can fix this by implementing the `PrintTrait` trait on `Rectangle` as shown in Listing 4-10.
To learn more about traits, see [Traits in Cairo](ch07-02-traits-in-cairo.md).

<span class="filename">Filename: src/lib.cairo</span>

```rust
use debug::PrintTrait;

struct Rectangle {
    width: u64,
    height: u64,
}

fn main() {
    let rectangle = Rectangle {
        width: 30_u64,
        height: 10_u64,
    };
    rectangle.print();
}

impl RectanglePrintImpl of PrintTrait<Rectangle> {
    fn print(self: Rectangle) {
        self.width.print();
        self.height.print();
    }
}
```

<span class="caption">Listing 4-10: Implementing the `PrintTrait` trait on `Rectangle`</span>

Nice! It’s not the prettiest output, but it shows the values of all the fields for this instance, which would definitely help during debugging.
