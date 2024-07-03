# Raycast Rot13
A simple implementation of the Rot13 cipher, as an easy-to-use extension for Raycast.

## What is Rot13
Rot13 is a type of _Caesar cipher_. It takes a string, splits it into letters, and moves those letters 13 places forward in the alphabet, wrapping around if needed.

For instance the string "Hello World" is encrypted as "Uryyb Jbeyq".

As the alphabet is 2*13 = 26 letters long, this cipher is an _involution_: the same process can be used to encrypt text as well as decrypt ciphertext. This means "Uryyb Jbeyq" has a Rot13 ciphertext of "Hello World".

While useless for serious cryptography, it is useful for (e.g.) discussing film spoilers in a public forum, where willing participants can easily en-/decode the messages without spoiling the film for other people around.


## Details and Howto
This implementation is case-sensitive and does not transform numbers, non-latin characters, or symbols.

To use, first copy the text you want to enccode or decode. Then open Raycast and type 'rot13' and hit enter.

If all goes well, Raycast will close and the ciphertext will be stored in your clipboard, ready to paste.

## Todo
- [ ] Add an alert, to make it clearer that encoding was successful
- [ ] Customizability, vis-a-vis the option to also transform numbers or remove case-sensitivity
