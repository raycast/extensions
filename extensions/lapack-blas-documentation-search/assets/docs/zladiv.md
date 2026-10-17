```fortran
complex*16 function zladiv (
        complex*16 x,
        complex*16 y
)
```

ZLADIV := X / Y, where X and Y are complex.  The computation of X / Y
will not overflow on an intermediary step unless the results
overflows.

## Parameters
X : COMPLEX\*16 [in]

Y : COMPLEX\*16 [in]
> The complex scalars X and Y.
