```fortran
real function clangt (
        character norm,
        integer n,
        complex, dimension( * ) dl,
        complex, dimension( * ) d,
        complex, dimension( * ) du
)
```

CLANGT  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
complex tridiagonal matrix A.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in CLANGT as described
> above.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, CLANGT is
> set to zero.

DL : COMPLEX array, dimension (N-1) [in]
> The (n-1) sub-diagonal elements of A.

D : COMPLEX array, dimension (N) [in]
> The diagonal elements of A.

DU : COMPLEX array, dimension (N-1) [in]
> The (n-1) super-diagonal elements of A.
