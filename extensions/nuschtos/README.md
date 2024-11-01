# NüschtOS

Search Nix Options with NüschtOS!

# Setup

You currently need to build the ixx CLI yourself, this is used to actually search the NüschtOS index. 

1. Install `cargo` via your preferred package manager.
2. Clone the (repo)[https://github.com/NuschtOS/ixx] and `cd` into the directory, for example `cd ~/git/ixx`.
3. Run `cargo build --release`.
4. Make the file executable `chmod +x ./target/release/ixx`
5. Now you can use the path to the built executable in the extension, for example `~/git/ixx/target/release/ixx`.
