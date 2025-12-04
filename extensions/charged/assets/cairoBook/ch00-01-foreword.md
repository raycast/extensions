# Foreword

In 2020, StarkWare released Cairo 0, a Turing-complete programming language supporting verifiable computation. Cairo started as an assembly language and gradually became more expressive. The learning curve was initially steep, as Cairo 0.x was a low-level language that did not entirely abstract the underlying cryptographic primitives required to build a proof for the execution of a program.

With the release of Cairo 1, the developer experience has considerably improved, abstracting away the underlying immutable memory model of the Cairo architecture where possible. Strongly inspired by Rust, Cairo 1 has been built to help you create provable programs without specific knowledge of its underlying architecture so that you can focus on the program itself, increasing the overall security of Cairo programs. Powered by a Rust VM, the execution of Cairo programs is now _blazingly_ fast, allowing you to build an extensive test suite without compromising on performance.

Blockchain developers that want to deploy contracts on Starknet will use the Cairo programming language to code their smart contracts. This allows the Starknet OS to generate execution traces for transactions to be proved by a prover, which is then verified on Ethereum L1 prior to updating the state root of Starknet.

However, Cairo is not only for blockchain developers. As a general purpose programming language, it can be used for any computation that would benefit from being proved on one computer and verified on other machines with lower hardware requirements.

This book is designed for developers with a basic understanding of programming concepts. It is a friendly and approachable text intended to help you level up your knowledge of Cairo, but also help you develop your programming skills in general. So, dive in and get ready to learn all there is to know about Cairo!

— The Cairo community
