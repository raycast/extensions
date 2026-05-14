```fortran
double precision function zlangt (
        character norm,
        integer n,
        complex*16, dimension( * ) dl,
        complex*16, dimension( * ) d,
        complex*16, dimension( * ) du
)
```

ZLANGT  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
complex tridiagonal matrix A.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in ZLANGT as described
> above.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, ZLANGT is
> set to zero.

DL : COMPLEX\*16 array, dimension (N-1) [in]
> The (n-1) sub-diagonal elements of A.

D : COMPLEX\*16 array, dimension (N) [in]
> The diagonal elements of A.

DU : COMPLEX\*16 array, dimension (N-1) [in]
> The (n-1) super-diagonal elements of A.
