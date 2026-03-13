# Generic Types and Traits

Every programming language has tools for effectively handling the duplication of concepts. In Cairo, one such tool is generics: abstract stand-ins for concrete types or other properties. We can express the behaviour of generics or how they relate to other generics without knowing what will be in their place when compiling and running the code.

Functions, structs, enums and traits can incorporate generic types as part of their definition instead of a concrete types like `u32` or `ContractAddress`.

Generics allow us to replace specific types with a placeholder that represents multiple types to remove code duplication.

For each concrete type that replaces a generic type the compiler creates a new definition, reducing development time for the programmer, but code duplication at compile level still exists. This may be of importance if you are writing Starknet contracts and using a generic for multiple types which will cause contract size to increment.

Then you’ll learn how to use traits to define behavior in a generic way. You can combine traits with generic types to constrain a generic type to accept only those types that have a particular behavior, as opposed to just any type.
