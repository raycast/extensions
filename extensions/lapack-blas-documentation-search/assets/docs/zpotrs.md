```fortran
subroutine zpotrs (
        character uplo,
        integer n,
        integer nrhs,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

ZPOTRS solves a system of linear equations A\*X = B with a Hermitian
positive definite matrix A using the Cholesky factorization
A = U\*\*H \* U or A = L \* L\*\*H computed by ZPOTRF.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in]
> The triangular factor U or L from the Cholesky factorization
> A = U\*\*H \* U or A = L \* L\*\*H, as computed by ZPOTRF.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

B : COMPLEX\*16 array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
