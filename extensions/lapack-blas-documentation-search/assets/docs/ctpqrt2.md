```fortran
subroutine ctpqrt2 (
        integer m,
        integer n,
        integer l,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( ldt, * ) t,
        integer ldt,
        integer info
)
```

CTPQRT2 computes a QR factorization of a complex
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
> The number of rows of the upper trapezoidal part of B.
> MIN(M,N) >= L >= 0.  See Further Details.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the upper triangular N-by-N matrix A.
> On exit, the elements on and above the diagonal of the array
> contain the upper triangular matrix R.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

B : COMPLEX array, dimension (LDB,N) [in,out]
> On entry, the pentagonal M-by-N matrix B.  The first M-L rows
> are rectangular, and the last L rows are upper trapezoidal.
> On exit, B contains the pentagonal matrix V.  See Further Details.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,M).

T : COMPLEX array, dimension (LDT,N) [out]
> The N-by-N upper triangular factor T of the block reflector.
> See Further Details.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= max(1,N)

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
