# More Math Commands

Implements some handy math functions that the built-in calculator lacks. The commands are meant to be used with non-negative integers.

## Syntax

- The command should always go first, followed by the number(s)
- Any non-numeric characters will be ignored, except for the first "word" which corresponds to the command
- For example, to compute the gcd of 12, 18, and 60,
  ```
  gcd 12 18 60
  ```
  and
  ```
  gcd 12,ajklsde18dk_60
  ```
  are functionally equivalent

## Current Commands

- `gcd` - Greatest Common Divisor / Factor
  - Additional aliases: `g`, `gcf`
- `lcm` - Least Common Multiple
  - Additional aliases: `l`
- `prime` - Checks if a number is prime
  - Additional aliases: `p`, `isprime`
- `factor` - Lists factors
  - Additional aliases: `f`, `factors`, `divisors`
- `primefactor` - Prime factorization
  - Additional aliases: `pf`, `pfactor`, `primef`
- `combination` - Number of combinations for n choose k
  - Additional aliases: `c`, `choose`
  - Can be run as `5c3` instead of `c 5 3`
- `permutation` - Number of permutations for n permute k
  - Additional aliases: `p`, `permute`
  - Can be run as `5p3` instead of `p 5 3`
