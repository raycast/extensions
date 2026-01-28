```fortran
real function clanht (
        character norm,
        integer n,
        real, dimension( * ) d,
        complex, dimension( * ) e
)
```

CLANHT  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
complex Hermitian tridiagonal matrix A.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in CLANHT as described
> above.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, CLANHT is
> set to zero.

D : REAL array, dimension (N) [in]
> The diagonal elements of A.

E : COMPLEX array, dimension (N-1) [in]
> The (n-1) sub-diagonal or super-diagonal elements of A.
