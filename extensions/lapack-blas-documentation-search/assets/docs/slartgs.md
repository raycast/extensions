```fortran
subroutine slartgs (
        real x,
        real y,
        real sigma,
        real cs,
        real sn
)
```

SLARTGS generates a plane rotation designed to introduce a bulge in
Golub-Reinsch-style implicit QR iteration for the bidiagonal SVD
problem. X and Y are the top-row entries, and SIGMA is the shift.
The computed CS and SN define a plane rotation satisfying

[  CS  SN  ]  .  [ X^2 - SIGMA ]  =  [ R ],
[ -SN  CS  ]     [    X \* Y    ]     [ 0 ]

with R nonnegative.  If X^2 - SIGMA and X \* Y are 0, then the
rotation is by PI/2.

## Parameters
X : REAL [in]
> The (1,1) entry of an upper bidiagonal matrix.

Y : REAL [in]
> The (1,2) entry of an upper bidiagonal matrix.

SIGMA : REAL [in]
> The shift.

CS : REAL [out]
> The cosine of the rotation.

SN : REAL [out]
> The sine of the rotation.
