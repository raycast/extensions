```fortran
subroutine dpftrs (
        character transr,
        character uplo,
        integer n,
        integer nrhs,
        double precision, dimension( 0: * ) a,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

DPFTRS solves a system of linear equations A\*X = B with a symmetric
positive definite matrix A using the Cholesky factorization
A = U\*\*T\*U or A = L\*L\*\*T computed by DPFTRF.

## Parameters
TRANSR : CHARACTER\*1 [in]
> = 'N':  The Normal TRANSR of RFP A is stored;
> = 'T':  The Transpose TRANSR of RFP A is stored.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of RFP A is stored;
> = 'L':  Lower triangle of RFP A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrix B.  NRHS >= 0.

A : DOUBLE PRECISION array, dimension ( N\*(N+1)/2 ). [in]
> The triangular factor U or L from the Cholesky factorization
> of RFP A = U\*\*T\*U or RFP A = L\*L\*\*T, as computed by DPFTRF.
> See note below for more details about RFP A.

B : DOUBLE PRECISION array, dimension (LDB,NRHS) [in,out]
> On entry, the right hand side matrix B.
> On exit, the solution matrix X.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
