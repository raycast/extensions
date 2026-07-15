```fortran
subroutine zptcon (
        integer n,
        double precision, dimension( * ) d,
        complex*16, dimension( * ) e,
        double precision anorm,
        double precision rcond,
        double precision, dimension( * ) rwork,
        integer info
)
```

ZPTCON computes the reciprocal of the condition number (in the
1-norm) of a complex Hermitian positive definite tridiagonal matrix
using the factorization A = L\*D\*L\*\*H or A = U\*\*H\*D\*U computed by
ZPTTRF.

Norm(inv(A)) is computed by a direct method, and the reciprocal of
the condition number is computed as
RCOND = 1 / (ANORM \* norm(inv(A))).

## Parameters
N : INTEGER [in]
> The order of the matrix A.  N >= 0.

D : DOUBLE PRECISION array, dimension (N) [in]
> The n diagonal elements of the diagonal matrix D from the
> factorization of A, as computed by ZPTTRF.

E : COMPLEX\*16 array, dimension (N-1) [in]
> The (n-1) off-diagonal elements of the unit bidiagonal factor
> U or L from the factorization of A, as computed by ZPTTRF.

ANORM : DOUBLE PRECISION [in]
> The 1-norm of the original matrix A.

RCOND : DOUBLE PRECISION [out]
> The reciprocal of the condition number of the matrix A,
> computed as RCOND = 1/(ANORM \* AINVNM), where AINVNM is the
> 1-norm of inv(A) computed in this routine.

RWORK : DOUBLE PRECISION array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
