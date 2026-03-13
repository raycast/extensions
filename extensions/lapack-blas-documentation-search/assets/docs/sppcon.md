```fortran
subroutine sppcon (
        character uplo,
        integer n,
        real, dimension( * ) ap,
        real anorm,
        real rcond,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

SPPCON estimates the reciprocal of the condition number (in the
1-norm) of a real symmetric positive definite packed matrix using
the Cholesky factorization A = U\*\*T\*U or A = L\*L\*\*T computed by
SPPTRF.

An estimate is obtained for norm(inv(A)), and the reciprocal of the
condition number is computed as RCOND = 1 / (ANORM \* norm(inv(A))).

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : REAL array, dimension (N\*(N+1)/2) [in]
> The triangular factor U or L from the Cholesky factorization
> A = U\*\*T\*U or A = L\*L\*\*T, packed columnwise in a linear
> array.  The j-th column of U or L is stored in the array AP
> as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = U(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = L(i,j) for j<=i<=n.

ANORM : REAL [in]
> The 1-norm (or infinity-norm) of the symmetric matrix A.

RCOND : REAL [out]
> The reciprocal of the condition number of the matrix A,
> computed as RCOND = 1/(ANORM \* AINVNM), where AINVNM is an
> estimate of the 1-norm of inv(A) computed in this routine.

WORK : REAL array, dimension (3\*N) [out]

IWORK : INTEGER array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
