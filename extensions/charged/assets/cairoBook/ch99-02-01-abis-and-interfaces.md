# ABIs and Contract Interfaces

Cross-contract interactions between smart contracts on a blockchain is a common practice which enables us to build flexible contracts that can speak with each other.

Achieving this on Starknet requires something we call an interface.

## Interface

An interface is a list of a contract's function definitions without implementations. In other words, an interface specifies the function declarations (name, parameters, visibility and return value) contained in a smart contract without including the function body.

Interfaces in Cairo are traits with the `#[abi]` attribute. If you are new to traits, check out the dedicated chapter on [traits](./ch07-02-traits-in-cairo.md).

For your Cairo code to qualify as an interface, it must meet the following requirements:

1. Must be appended with the `#[abi]` attribute.
2. Your interface functions should have no implementations.
3. You must explicitly declare the function's decorator.
4. Your interface should not declare a constructor.
5. Your interface should not declare state variables.

Here's a sample interface for an ERC20 token contract:

```rust
use starknet::ContractAddress;

#[abi]
trait IERC20 {
    #[view]
    fn name() -> felt252;

    #[view]
    fn symbol() -> felt252;

    #[view]
    fn decimals() -> u8;

    #[view]
    fn total_supply() -> u256;

    #[view]
    fn balance_of(account: ContractAddress) -> u256;

    #[view]
    fn allowance(owner: ContractAddress, spender: ContractAddress) -> u256;

    #[external]
    fn transfer(recipient: ContractAddress, amount: u256) -> bool;

    #[external]
    fn transfer_from(sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;

    #[external]
    fn approve(spender: ContractAddress, amount: u256) -> bool;
}
```

<span class="caption">Listing 9-1: A simple ERC20 Interface</span>

## ABIs

ABI stands for Application Binary Interface. ABIs gives a smart contract the ability to communicate and interact with external applications or other smart contracts. ABIs can be likened to APIs in traditional web development, which helps data flow between applications and servers.

While we write our smart contract logics in high-level Cairo, they are stored on the VM as executable bytecodes which are in binary formats. Since this bytecode is not human readable, it requires interpretation to be understood. This is where ABIs come into play, defining specific methods which can be called to a smart contract for execution.

Every contract on Starknet has an Application Binary Interface (ABI) that defines how to encode and decode data when calling its methods.

In the next chapter, we are going to be looking into how we can call other smart contracts using a `Contract Dispatcher`, `Library Dispatcher`, and `System calls`.
