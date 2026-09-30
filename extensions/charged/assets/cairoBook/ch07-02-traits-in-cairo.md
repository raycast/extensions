# Traits in Cairo

Traits specify functionality blueprints that can be implemented. The blueprint specification includes a set of function signatures containing type annotations for the parameters and return value. This sets a standard to implement the specific functionality.

## Defining a Trait

To define a trait, you use the keyword `trait` followed by the name of the trait in `PascalCase` then the function signatures in a pair of curly braces.

For example, let's say that we have multiple structs representing shapes. We want our application to be able to perform geometry operations on these shapes, So we define a trait `ShapeGeometry` that contains a blueprint to implement geometry operations on a shape like this:

```rust
trait ShapeGeometry {
    fn boundary(self: Rectangle) -> u64;
    fn area(self: Rectangle) -> u64;
}
```

Here our trait `ShapeGeometry` declares signatures for two methods `boundary` and `area`. When implemented, both these functions should return a `u64` and accept parameters as specified by the trait.

## Implementing a Trait

A trait can be implemented using `impl` keyword with the name of your implementation followed by `of` then the name of trait being implemented. Here's an example implementing `ShapeGeometry` trait.

```rust
impl RectangleGeometry of ShapeGeometry {
	fn boundary(self: Rectangle) -> u64 {
        2_u64 * (self.height + self.width)
    }
	fn area(self: Rectangle) -> u64 {
		self.height * self.width
	}
}
```

In the code above, `RectangleGeometry` implements the trait `ShapeGeometry` defining what the methods `boundary` and `area` should do. Note that the function parameters and return value types are identical to the trait specification.

## Parameter `self`

In the example above, `self` is a special parameter. When a parameter with name `self` is used, the implemented functions are also [attached to the instances of the type as methods](ch04-03-method-syntax.md#defining-methods). Here's an illustration,

When the `ShapeGeometry` trait is implemented, the function `area` from the `ShapeGeometry` trait can be called in two ways:

```rust
let rect = Rectangle { ... }; // Rectangle instantiation

// First way, as a method on the struct instance
let area1 = rect.area();
// Second way, from the implementation
let area2 = RectangleGeometry::area(rect);
// `area1` has same value as `area2`
area1.print();
area2.print();
```

And the implementation of the `area` method will be accessed via the `self` parameter.

## Generic Traits

Usually we want to write a trait when we want multiple types to implement a functionality in a standard way. However, in the example above the signatures are static and cannot be used for multiple types. To do this, we use generic types when defining traits.

In the example below, we use generic type `T` and our method signatures can use this alias which can be provided during implementation.

```rust
use debug::PrintTrait;

// Here T is an alias type which will be provided buring implementation
trait ShapeGeometry<T> {
    fn boundary(self: T) -> u64;
    fn area(self: T) -> u64;
}

// Implementation RectangleGeometry passes in <Rectangle>
// to implement the trait for that type
impl RectangleGeometry of ShapeGeometry<Rectangle> {
    fn boundary(self: Rectangle) -> u64 {
        2_u64 * (self.height + self.width)
    }
    fn area(self: Rectangle) -> u64 {
        self.height * self.width
    }
}

// We might have another struct Circle
// which can use the same trait spec
impl CircleGeometry of ShapeGeometry<Circle> {
    fn boundary(self: Circle) -> u64 {
        (2_u64 * 314_u64 * self.radius) / 100_u64
    }
    fn area(self: Circle) -> u64 {
        (314_u64 * self.radius * self.radius) / 100_u64
    }
}

fn main() {
    let rect = Rectangle { height: 5_u128, width: 7_u128 };
    rect.area().print(); // 35
    rect.boundary().print(); // 24

    let circ = Circle { radius: 5_u128 };
    circ.area().print(); // 78
    circ.boundary().print(); // 31
}
```

## Managing and using external trait implementations

To use traits methods, you need to make sure the correct traits/implementation(s) are imported. In the code above we imported `PrintTrait` from `debug` with `use debug::PrintTrait;` to use `print()` methods.

In some cases you might need to import not only the trait but also the implementation if they are declared in separate modules.
If `CircleGeometry` was in a separate module/file `circle` then to use `boundary` on `circ: Circle`, we'd need to import `CircleGeometry` in addition to `ShapeGeometry`.

If the code was organised into modules like this,

```rust
use debug::PrintTrait;

// struct Circle { ... } and struct Rectangle { ... }

mod geometry {
    use super::Rectangle;
    trait ShapeGeometry<T> {
        // ...
    }

    impl RectangleGeometry of ShapeGeometry::<Rectangle> {
        // ...
    }
}

// Could be in a different file
mod circle {
    use super::geometry::ShapeGeometry;
    use super::Circle;
    impl CircleGeometry of ShapeGeometry::<Circle> {
        // ...
    }
}

fn main() {
    let rect = Rectangle { height: 5_u64, width: 7_u64 };
    let circ = Circle { radius: 5_u64 };
    // Fails with this error
    // Method `area` not found on... Did you import the correct trait and impl?
    rect.area().print();
    circ.area().print();
}
```

To make it work, in addition to,

```rust
use geometry::ShapeGeometry;
```

you might also need to use `CircleGeometry`,

```rust
use circle::CircleGeometry
```
