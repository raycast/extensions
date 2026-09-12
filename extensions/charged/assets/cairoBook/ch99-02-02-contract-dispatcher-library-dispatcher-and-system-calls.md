# Contract Dispatcher, Library Dispatcher and System calls

Each time a contract interface is created on Starknet, two dispatchers are automatically created and exported:

1. The Contract Dispatcher
2. The Library Dispatcher

In this chapter, we are going to extensively discuss how these dispatchers work and their usage.

To effectively break down the concepts in this chapter, we are going to be using the IERC20 interface from the previous chapter (refer to Listing 9-1):

## Contract Dispatcher

Traits annotated with the `#[abi]` attribute are programmed to automatically generate and export the relevant dispatcher logic on compilation. The compiler also generates a new trait, two new structs (one for contract calls, and the other for library calls) and their implementation of this trait. Our interface is expanded into something like this:

```rust
trait IERC20DispatcherTrait<T> {
    fn get_name(self: T) -> felt252;
    fn transfer(self: T, recipient: ContractAddress, amount: u256);
}

#[derive(Copy, Drop)]
struct IERC20Dispatcher {
    contract_address: starknet::ContractAddress,
}

impl IERC20DispatcherImpl of IERC20DispatcherTrait::<IERC20Dispatcher> {
    fn get_name(self: IERC20Dispatcher) -> felt252 {
        // starknet::call_contract_syscall is called in here
    }
    fn transfer(self: IERC20Dispatcher, recipient: ContractAddress, amount: u256) {
        // starknet::call_contract_syscall is called in here
    }
}
```

<span class="caption">Listing 9-2: An expanded form of the IERC20 trait</span>

**NB:** The expanded code for our IERC20 interface is a lot more robust, but to keep this chapter concise and straight to the point, we focused on one view function `get_name`, and one external function `transfer`.

It's also worthy of note that all these is abstracted behind the scenes thanks to the power of Cairo plugins.

### Calling Contracts using the Contract Dispatcher

This is an example of a contract named `Dispatcher` using the Contract interface dispatcher to call an ERC-20 contract in the ERC-20 contract's context and, in the case of `transfer_token`, altering the state of the ERC-20 contract:

```rust
//**** Specify interface here ****//

#[contract]
mod Dispatcher {
    use super::IERC20DispatcherTrait;
    use super::IERC20Dispatcher;
    use starknet::ContractAddress;

    #[view]
    fn token_name(
        _contract_address: ContractAddress
    ) -> felt252 {
        IERC20Dispatcher {contract_address: _contract_address }.name()
    }

    #[external]
    fn transfer_token(
        _contract_address: ContractAddress, recipient: ContractAddress, amount: u256
    ) -> bool {
        IERC20Dispatcher {contract_address: _contract_address }.transfer(recipient, amount)
    }
}
```

<span class="caption">Listing 9-3: A sample contract which uses the Contract Dispatcher</span>

As you can see, we had to first import the `IERC20DispatcherTrait` and `IERC20Dispatcher` which was generated and exported on compiling our interface, then we make calls to the methods implemented for the `IERC20Dispatcher` struct (`name`, `transfer`, etc), passing in the `contract_address` parameter which represents the address of the contract we want to call.

## Library Dispatcher

The key difference between the contract dispatcher and the library dispatcher is that while the contract dispatcher calls an external contract's logic in the external contract's context, the library dispatcher calls the target contract's classhash, whilst executing the call in the calling contract's context.
So unlike the contract dispatcher, calls made using the library dispatcher have no possibility of tampering with the target contract's state.

As stated in the previous chapter, contracts annotated with the `#[abi]` macro on compilation generates a new trait, two new structs (one for contract calls, and the other for library calls) and their implementation of this trait. The expanded form of the library traits looks like:

```rust
trait IERC20DispatcherTrait<T> {
    fn get_name(self: T) -> felt252;
    fn transfer(self: T, recipient: ContractAddress, amount: u256);
}

#[derive(Copy, Drop)]
struct IERC20LibraryDispatcher {
    class_hash: starknet::ClassHash,
}

impl IERC20LibraryDispatcherImpl of IERC20DispatcherTrait::<IERC20LibraryDispatcher> {
    fn get_name(self: IERC20LibraryDispatcher) -> felt252 {
        // starknet::syscalls::library_call_syscall  is called in here
    }
    fn transfer(self: IERC20LibraryDispatcher, recipient: ContractAddress, amount: u256) {
        // starknet::syscalls::library_call_syscall  is called in here
    }
}
```

<span class="caption">Listing 9-4: An expanded form of the IERC20 trait</span>

### Calling Contracts using the Library Dispatcher

Below's a sample code on calling contracts using the Library Dispatcher:

```rust
//**** Specify interface here ****//

use super::IERC20DispatcherTrait;
use super::IERC20LibraryDispatcher;
use starknet::ContractAddress;

#[view]
fn token_name() -> felt252 {
    IERC20LibraryDispatcher { class_hash: starknet::class_hash_const::<0x1234>() }.name()
}

#[external]
fn transfer_token(
    recipient: ContractAddress, amount: u256
) -> bool {
    IERC20LibraryDispatcher { class_hash: starknet::class_hash_const::<0x1234>() }.transfer(recipient, amount)
}
```

<span class="caption">Listing 9-4: A sample contract using the Library Dispatcher</span>

As you can see, we had to first import the `IERC20DispatcherTrait` and `IERC20LibraryDispatcher` which was generated and exported on compiling our interface, then we make calls to the methods implemented for the `IERC20LibraryDispatcher` struct (`name`, `transfer`, etc), passing in the `class_hash` parameter which represents the class of the contract we want to call.

## Calling Contracts using low-level System calls

Another way to call other contracts is to use the `starknet::call_contract_syscall` system call. The Dispatchers we described in the previous sections are high-level syntaxes for this low-level system call.

Using the system call `starknet::call_contract_syscall` can be handy for customized error handling or possessing more control over the serialization/deserialization of the call data and the returned data. Here's an example demonstrating a low-level `transfer` call:

```rust
#[external]
fn transfer_token(
    address: starknet::ContractAddress, selector: felt252, calldata: Array<felt252>
) -> Span::<felt252> {
    starknet::call_contract_syscall(address, selector, calldata.span()).unwrap_syscall()
}
```

<span class="caption">Listing 9-5: A sample contract implementing system calls</span>

As you can see, rather than pass our function arguments directly, we passed in the contract address, function selector (which is a keccak hash of the function name), and the calldata (function arguments). At the end, we get returned a serialized value which we'll need to deserialize ourselves!
