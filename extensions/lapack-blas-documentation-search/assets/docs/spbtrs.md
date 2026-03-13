```fortran
subroutine spbtrs (
        character uplo,
        integer n,
        integer kd,
        integer nrhs,
        real, dimension( ldab, * ) ab,
        integer ldab,
        real, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

SPBTRS solves a system of linear equations A\*X = B with a symmetric
positive definite band matrix A using the Cholesky factorization
A = U\*\*T\*U or A = L\*L\*\*T computed by SPBTRF.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangular factor stored in AB;
> = 'L':  Lower triangular factor stored in AB.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

KD : INTEGER [in]
> The number of superdiagonals of the matrix A if UPLO = 'U',
> or the number of subdiagonals if UPLO = 'L'.  KD >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

AB : REAL array, dimension (LDAB,N) [in]
> The triangular factor U or L from the Cholesky factorization
> A = U\*\*T\*U or A = L\*L\*\*T of the band matrix A, stored in the
> first KD+1 rows of the array.  The j-th column of U or L is
> stored in the j-th column of the array AB as follows:
> if UPLO ='U', AB(kd+1+i-j,j) = U(i,j) for max(1,j-kd)<=i<=j;
> if UPLO ='L', AB(1+i-j,j)    = L(i,j) for j<=i<=min(n,j+kd).

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KD+1.

B : REAL array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
