# Starknet contracts: Contract Syntax

This chapter will guide you on how to create smart contracts in Cairo, and will clarify the distinction between Cairo programs and Starknet contracts.

## Cairo programs and Starknet contracts

Starknet contracts are a special subset of Cairo programs, so the concepts previously learned in this book are still applicable to write Starknet contracts.
As you may have already noticed, a Cairo program must always have a function `main` that serves as the entry point for this program:

```rust
fn main() {}
```

Starknet contracts are essentially programs that can run on the Starknet OS, and as such, have access to Starknet's state. For a module to be handled as a contract by the compiler, it must be annotated with the `#[contract]` attribute:

```rust
#[contract]
mod Example{
    use starknet::get_caller_address;
    use starknet::ContractAddress;

    struct Storage{
        names: LegacyMap::<ContractAddress, felt252>,
    }

    #[event]
    fn StoredName(caller: ContractAddress, name:felt252){}

    #[constructor]
    fn constructor(_name: felt252, _address: ContractAddress){
        names::write(_address, _name);
    }

    #[external]
    fn store_name(_name: felt252){
        let caller = get_caller_address();
        names::write(caller, _name);
        StoredName(caller,_name);
    }

    #[view]
    fn get_name(_address:ContractAddress) -> felt252{
        let name = names::read(_address);
        return name;
    }
}
```

<span class="caption">Listing 9-1: A simple naming service contract</span>

> NB: Starknet contracts are defined within [modules](./ch06-02-defining-modules-to-control-scope.md).

## Starknet Contract Attributes

Attributes are special annotations that modify the behavior of certain functions or methods. They are placed preceding a function and are denoted by the `#[]` symbol.

<!-- TODO: Appendix on attributes -->

Here are a list of common attributes used in Starknet contracts:

1. `#[contract]`: This attribute is used to annotate a module to be compiled as a Starknet contract.
   The compiler recognizes this attribute and prepares the module with necessary contract elements,
   such as the logic to handle external contract calls or how to access storage variables.

2. `#[constructor]`: This attribute marks a function as a constructor. The constructor function is called only once upon deploying a contract, setting the initial state of the contract.

3. `#[external]`: This attribute marks a function as an external function. External functions can be called by other contracts or externally and can modify the contract's state.

4. `#[view]`: This attribute marks a function as a view function. View functions are read-only functions that allow you to access data from the contract, but prevent you from modifying the state of the blockchain.

5. `#[event]`: This is used to define events that can be emitted by the contract.

6. `#[l1_handler]`: This attribute is used to mark functions which can receive messages from L1s.

## Storage Variables

Storage variables allow you to store data that will be stored on the blockchain in the contract's storage. These data are persistent and can be accessed and modified anytime once the contract is deployed.

Storage variables in Starknet contracts are stored in a special struct called `Storage`:

```rust
struct Storage{
    id: u8,
    names: LegacyMap::<ContractAddress, felt252>,
}
```

<span class="caption">Listing 9-2: A Storage Struct</span>

The storage struct is a [struct](./ch04-00-using-structs-to-structure-related-data.md) like any other,
except that it allows you to define mappings using the `LegacyMap` type.

### Storage Mappings

Mappings are a key-value data structure that you can use to store data within a smart contract. They are essentially hash tables that allow you to associate a unique key with a corresponding value. Mappings are also useful to store sets of data, as it's impossible to store arrays in storage.

A mapping is a variable of type LegacyMap, in which the key and value types are specified within angular brackets <>.
It is important to note that the `LegacyMap` type can only be used inside the `Storage` struct, and can't be used to define mappings in user-defined structs.
The syntax for declaring a mapping is as follows in Listing 9-2.

You can also create more complex mappings than that found in Listing 9-2 like the popular `allowances` storage variable in the ERC20 Standard which maps the `owner` and `spender` to the `allowance` using tuples:

```rust
struct Storage{
    allowances: LegacyMap::<(ContractAddress, ContractAddress), u256>
}
```

In mappings, the address of the value at key `k_1,...,k_n` is `h(...h(h(sn_keccak(variable_name),k_1),k_2),...,k_n)` where ℎ
is the Pedersen hash and the final value is taken `mod2251−256`. You can learn more about the contract storage layout in the [Starknet Documentation](https://docs.starknet.io/documentation/architecture_and_concepts/Contracts/contract-storage/#storage_variables)

### Reading from Storage

To read the value of the storage variable `names`, we call the `read` function on the `names` storage variable, passing in the key `_address` as a parameter.

```rust
let name = names::read(_address);
```

<span class="caption">Listing 9-3: Calling the `read` function on the `names` variable</span>

> Note: When the storage variable does not store a mapping, its value is accessed without passing any parameters to the read method

### Writing to Storage

To write a value to the storage variable `names`, we call the `write` function on the `names` storage variable, passing in the key and values as arguments.

```rust
names::write(_address, _name);
```

<span class="caption">Listing 9-4: Writing to the `names` variable</span>

## Functions

In this section, we are going to be looking at some popular function types you'd encounter with most contracts:

### 1. Constructors

Constructors are a special type of function that runs only once when deploying a contract, and can be used to initialize the state of the contract.

```rust
#[constructor]
fn constructor(_name: felt252, _address: ContractAddress){
    names::write(_address, _name);
}
```

Some important rules to note:

1. Your contract can't have more than one constructor.
2. Your constructor function must be named `constructor`.
3. Lastly, it must be annotated with the `#[constructor]` attribute.

### 2. External functions

External functions are functions that can modify the state of a contract. They are public and can be called by any other contract or externally.
You can define external functions by annotating them with the `#[external]` attribute:

```rust
#[external]
fn store_name(_name: felt252){
    let caller = get_caller_address();
    names::write(caller, _name);
    StoredName(caller,_name);
}
```

### 3. View functions

View functions are read-only functions allowing you to access data from the contract while ensuring that the state of the contract is not modified. They can be called by other contracts or externally.
You can define view functions by annotating them with the `#[view]` attribute:

```rust
#[view]
fn get_name(_address:ContractAddress) -> felt252{
    let name = names::read(_address);
    return name;
}
```

> **NB:** It's important to note that, both external and view functions are public. To create an internal function in a contract, you simply don't annotate it with any attribute.

## Events

Events are custom data structures that are emitted by smart contracts during execution.
They provide a way for smart contracts to communicate with the external world by logging information
about specific occurences in a contract.

Events play a crucial role in the creation of smart contracts. Take, for instance, the Non-Fungible Tokens (NFTs) minted on Starknet. All of these are indexed and stored in a database, then displayed to users through the use of these events. Neglecting to include an event within your NFT contract could lead to a bad user experience. This is because users may not see their NFTs appear in their wallets (wallets use these indexers to display a user's NFTs).

### Defining events

An event is defined as an empty function annotated with the `#[event]` attribute. The parameters of this function
are the data that will be emitted by the event.

In Listing 9-1, `StoredName` is an event that emits information when names are stored in the contract:

```rust
#[event]
fn StoredName(caller: ContractAddress, name:felt252){}
```

We pass in the emitted data types as parameters within the parentheses. In this example, our event will emit the contract address of the caller and the name stored within the contract.

### Emitting events

After defining events, we can emit them by simply calling the event name like we'll call functions,
passing in the values to be emitted as parameters:

```rust
StoredName(caller,_name);
```
