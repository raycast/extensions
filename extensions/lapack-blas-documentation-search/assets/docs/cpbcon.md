```fortran
subroutine cpbcon (
        character uplo,
        integer n,
        integer kd,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        real anorm,
        real rcond,
        complex, dimension( * ) work,
        real, dimension( * ) rwork,
        integer info
)
```

CPBCON estimates the reciprocal of the condition number (in the
1-norm) of a complex Hermitian positive definite band matrix using
the Cholesky factorization A = U\*\*H\*U or A = L\*L\*\*H computed by
CPBTRF.

An estimate is obtained for norm(inv(A)), and the reciprocal of the
condition number is computed as RCOND = 1 / (ANORM \* norm(inv(A))).

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangular factor stored in AB;
> = 'L':  Lower triangular factor stored in AB.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KD : INTEGER [in]
> The number of superdiagonals of the matrix A if UPLO = 'U',
> or the number of sub-diagonals if UPLO = 'L'.  KD >= 0.

AB : COMPLEX array, dimension (LDAB,N) [in]
> The triangular factor U or L from the Cholesky factorization
> A = U\*\*H\*U or A = L\*L\*\*H of the band matrix A, stored in the
> first KD+1 rows of the array.  The j-th column of U or L is
> stored in the j-th column of the array AB as follows:
> if UPLO ='U', AB(kd+1+i-j,j) = U(i,j) for max(1,j-kd)<=i<=j;
> if UPLO ='L', AB(1+i-j,j)    = L(i,j) for j<=i<=min(n,j+kd).

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD+1.

ANORM : REAL [in]
> The 1-norm (or infinity-norm) of the Hermitian band matrix A.

RCOND : REAL [out]
> The reciprocal of the condition number of the matrix A,
> computed as RCOND = 1/(ANORM \* AINVNM), where AINVNM is an
> estimate of the 1-norm of inv(A) computed in this routine.

WORK : COMPLEX array, dimension (2\*N) [out]

RWORK : REAL array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
