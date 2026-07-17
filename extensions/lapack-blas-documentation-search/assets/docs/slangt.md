```fortran
real function slangt (
        character norm,
        integer n,
        real, dimension( * ) dl,
        real, dimension( * ) d,
        real, dimension( * ) du
)
```

SLANGT  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
real tridiagonal matrix A.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in SLANGT as described
> above.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, SLANGT is
> set to zero.

DL : REAL array, dimension (N-1) [in]
> The (n-1) sub-diagonal elements of A.

D : REAL array, dimension (N) [in]
> The diagonal elements of A.

DU : REAL array, dimension (N-1) [in]
> The (n-1) super-diagonal elements of A.
