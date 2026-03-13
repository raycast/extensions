```fortran
subroutine dpotrs (
        character uplo,
        integer n,
        integer nrhs,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

DPOTRS solves a system of linear equations A\*X = B with a symmetric
positive definite matrix A using the Cholesky factorization
A = U\*\*T\*U or A = L\*L\*\*T computed by DPOTRF.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in]
> The triangular factor U or L from the Cholesky factorization
> A = U\*\*T\*U or A = L\*L\*\*T, as computed by DPOTRF.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

B : DOUBLE PRECISION array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
