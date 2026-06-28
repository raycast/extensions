```fortran
subroutine zppcon (
        character uplo,
        integer n,
        complex*16, dimension( * ) ap,
        double precision anorm,
        double precision rcond,
        complex*16, dimension( * ) work,
        double precision, dimension( * ) rwork,
        integer info
)
```

ZPPCON estimates the reciprocal of the condition number (in the
1-norm) of a complex Hermitian positive definite packed matrix using
the Cholesky factorization A = U\*\*H\*U or A = L\*L\*\*H computed by
ZPPTRF.

An estimate is obtained for norm(inv(A)), and the reciprocal of the
condition number is computed as RCOND = 1 / (ANORM \* norm(inv(A))).

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : COMPLEX\*16 array, dimension (N\*(N+1)/2) [in]
> The triangular factor U or L from the Cholesky factorization
> A = U\*\*H\*U or A = L\*L\*\*H, packed columnwise in a linear
> array.  The j-th column of U or L is stored in the array AP
> as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = U(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = L(i,j) for j<=i<=n.

ANORM : DOUBLE PRECISION [in]
> The 1-norm (or infinity-norm) of the Hermitian matrix A.

RCOND : DOUBLE PRECISION [out]
> The reciprocal of the condition number of the matrix A,
> computed as RCOND = 1/(ANORM \* AINVNM), where AINVNM is an
> estimate of the 1-norm of inv(A) computed in this routine.

WORK : COMPLEX\*16 array, dimension (2\*N) [out]

RWORK : DOUBLE PRECISION array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
