## Hello, World

Now that you’ve installed Cairo, it’s time to write your first Cairo program.
It’s traditional when learning a new language to write a little program that
prints the text `Hello, world!` to the screen, so we’ll do the same here!

> Note: This book assumes basic familiarity with the command line. Cairo makes
> no specific demands about your editing or tooling or where your code lives, so
> if you prefer to use an integrated development environment (IDE) instead of
> the command line, feel free to use your favorite IDE. The Cairo team has developed
> a VSCode extension for the Cairo language that you can use to get the features from
> the language server and code highlighting. See [Appendix A][devtools]
> for more details.

### Creating a Project Directory

You’ll start by making a directory to store your Cairo code. It doesn’t matter
to Cairo where your code lives, but for the exercises and projects in this book,
we suggest making a _cairo_projects_ directory in your home directory and keeping all
your projects there.

Open a terminal and enter the following commands to make a _cairo_projects_ directory
and a directory for the “Hello, world!” project within the _cairo_projects_ directory.

For Linux, macOS, and PowerShell on Windows, enter this:

```console
mkdir ~/cairo_projects
cd ~/cairo_projects
mkdir hello_world
cd hello_world
```

For Windows CMD, enter this:

```cmd
> mkdir "%USERPROFILE%\projects"
> cd /d "%USERPROFILE%\projects"
> mkdir hello_world
> cd hello_world
```

### Writing and Running a Cairo Program

Next, make a new source file and call it _main.cairo_. Cairo files always end with
the _.cairo_ extension. If you’re using more than one word in your filename, the
convention is to use an underscore to separate them. For example, use
_hello_world.cairo_ rather than _helloworld.cairo_.

Now open the _main.cairo_ file you just created and enter the code in Listing 1-1.

<span class="filename">Filename: main.cairo</span>

```rust
use debug::PrintTrait;
fn main() {
    'Hello, world!'.print();
}
```

<span class="caption">Listing 1-1: A program that prints `Hello, world!`</span>

Save the file and go back to your terminal window in the
_~/cairo_projects/hello_world_ directory. Enter the following
commands to compile and run the file:

```console
$ cairo-run main.cairo
Hello, world!
```

Regardless of your operating system, the string `Hello, world!` should print to
the terminal.

If `Hello, world!` did print, congratulations! You’ve officially written a Cairo
program. That makes you a Cairo programmer—welcome!

### Anatomy of a Cairo Program

Let’s review this “Hello, world!” program in detail. Here’s the first piece of
the puzzle:

```rust
fn main() {

}
```

These lines define a function named `main`. The `main` function is special: it
is always the first code that runs in every executable Cairo program. Here, the
first line declares a function named `main` that has no parameters and returns
nothing. If there were parameters, they would go inside the parentheses `()`.

The function body is wrapped in `{}`. Cairo requires curly brackets around all
function bodies. It’s good style to place the opening curly bracket on the same
line as the function declaration, adding one space in between.

> Note: If you want to stick to a standard style across Cairo projects, you can
> use the automatic formatter tool called `cairo-format` to format your code in a
> particular style (more on `cairo-format` in
> [Appendix A][devtools]). The Cairo team has included this tool
> with the standard Cairo distribution, as `cairo-run` is, so it should already be
> installed on your computer!

Prior to the main function declaration, The line `use debug::PrintTrait;` is responsible for importing an item defined in another module. In this case, we are importing the `PrintTrait` item from the Cairo core library. By doing so, we gain the ability to use the `print()` method on data types that are compatible with printing.

The body of the `main` function holds the following code:

```rust
    'Hello, world!'.print();
```

This line does all the work in this little program: it prints text to the
screen. There are four important details to notice here.

First, Cairo style is to indent with four spaces, not a tab.

Second, the `print()` function called is a method from the trait `PrintTrait`. This trait is imported from the Cairo core library, and it defines how to print values to the screen for different data types. In our case, our text is defined as a "short string", which is an ASCII string that can fit in Cairo's basic data type, which is the `felt252` type. By calling `Hello, world!'.print()`, we're calling the `print()` method of the `felt252` implementation of the `PrintTrait` trait.

Third, you see the `'Hello, world!'` short string. We pass this short string as an argument
to `print()`, and the short string is printed to the screen.

Fourth, we end the line with a semicolon (`;`), which indicates that this
expression is over and the next one is ready to begin. Most lines of Cairo code
end with a semicolon.

Just running with `cairo-run` is fine for simple programs, but as your project
grows, you’ll want to manage all the options and make it easy to share your
code. Next, we’ll introduce you to the Scarb tool, which will help you write
real-world Cairo programs.

[devtools]: appendix-04-useful-development-tools.md
