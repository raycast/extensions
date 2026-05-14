```fortran
double precision function dlanst (
        character norm,
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( * ) e
)
```

DLANST  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
real symmetric tridiagonal matrix A.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in DLANST as described
> above.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, DLANST is
> set to zero.

D : DOUBLE PRECISION array, dimension (N) [in]
> The diagonal elements of A.

E : DOUBLE PRECISION array, dimension (N-1) [in]
> The (n-1) sub-diagonal or super-diagonal elements of A.
