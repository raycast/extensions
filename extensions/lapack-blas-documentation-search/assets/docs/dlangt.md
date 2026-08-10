```fortran
double precision function dlangt (
        character norm,
        integer n,
        double precision, dimension( * ) dl,
        double precision, dimension( * ) d,
        double precision, dimension( * ) du
)
```

DLANGT  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
real tridiagonal matrix A.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in DLANGT as described
> above.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, DLANGT is
> set to zero.

DL : DOUBLE PRECISION array, dimension (N-1) [in]
> The (n-1) sub-diagonal elements of A.

D : DOUBLE PRECISION array, dimension (N) [in]
> The diagonal elements of A.

DU : DOUBLE PRECISION array, dimension (N-1) [in]
> The (n-1) super-diagonal elements of A.
