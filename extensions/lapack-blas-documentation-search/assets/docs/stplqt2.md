```fortran
subroutine stplqt2 (
        integer m,
        integer n,
        integer l,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( ldt, * ) t,
        integer ldt,
        integer info
)
```

STPLQT2 computes a LQ a factorization of a real
matrix C, which is composed of a triangular block A and pentagonal block B,
using the compact WY representation for Q.

## Parameters
M : INTEGER [in]
> The total number of rows of the matrix B.
> M >= 0.

N : INTEGER [in]
> The number of columns of the matrix B, and the order of
> the triangular matrix A.
> N >= 0.

L : INTEGER [in]
> The number of rows of the lower trapezoidal part of B.
> MIN(M,N) >= L >= 0.  See Further Details.

A : REAL array, dimension (LDA,M) [in,out]
> On entry, the lower triangular M-by-M matrix A.
> On exit, the elements on and below the diagonal of the array
> contain the lower triangular matrix L.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

B : REAL array, dimension (LDB,N) [in,out]
> On entry, the pentagonal M-by-N matrix B.  The first N-L columns
> are rectangular, and the last L columns are lower trapezoidal.
> On exit, B contains the pentagonal matrix V.  See Further Details.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,M).

T : REAL array, dimension (LDT,M) [out]
> The N-by-N upper triangular factor T of the block reflector.
> See Further Details.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= max(1,M)

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
