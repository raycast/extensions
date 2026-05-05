```fortran
subroutine cpocon (
        character uplo,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        real anorm,
        real rcond,
        complex, dimension( * ) work,
        real, dimension( * ) rwork,
        integer info
)
```

CPOCON estimates the reciprocal of the condition number (in the
1-norm) of a complex Hermitian positive definite matrix using the
Cholesky factorization A = U\*\*H\*U or A = L\*L\*\*H computed by CPOTRF.

An estimate is obtained for norm(inv(A)), and the reciprocal of the
condition number is computed as RCOND = 1 / (ANORM \* norm(inv(A))).

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in]
> The triangular factor U or L from the Cholesky factorization
> A = U\*\*H\*U or A = L\*L\*\*H, as computed by CPOTRF.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

ANORM : REAL [in]
> The 1-norm (or infinity-norm) of the Hermitian matrix A.

RCOND : REAL [out]
> The reciprocal of the condition number of the matrix A,
> computed as RCOND = 1/(ANORM \* AINVNM), where AINVNM is an
> estimate of the 1-norm of inv(A) computed in this routine.

WORK : COMPLEX array, dimension (2\*N) [out]

RWORK : REAL array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
