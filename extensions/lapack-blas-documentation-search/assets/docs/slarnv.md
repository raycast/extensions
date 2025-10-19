```fortran
subroutine slarnv (
        integer idist,
        integer, dimension( 4 ) iseed,
        integer n,
        real, dimension( * ) x
)
```

SLARNV returns a vector of n random real numbers from a uniform or
normal distribution.

## Parameters
IDIST : INTEGER [in]
> Specifies the distribution of the random numbers:
> = 1:  uniform (0,1)
> = 2:  uniform (-1,1)
> = 3:  normal (0,1)

ISEED : INTEGER array, dimension (4) [in,out]
> On entry, the seed of the random number generator; the array
> elements must be between 0 and 4095, and ISEED(4) must be
> odd.
> On exit, the seed is updated.

N : INTEGER [in]
> The number of random numbers to be generated.

X : REAL array, dimension (N) [out]
> The generated random numbers.
