```fortran
subroutine ctplqt (
        integer m,
        integer n,
        integer l,
        integer mb,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( ldt, * ) t,
        integer ldt,
        complex, dimension( * ) work,
        integer info
)
```

CTPLQT computes a blocked LQ factorization of a complex
matrix C, which is composed of a
triangular block A and pentagonal block B, using the compact
WY representation for Q.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix B, and the order of the
> triangular matrix A.
> M >= 0.

N : INTEGER [in]
> The number of columns of the matrix B.
> N >= 0.

L : INTEGER [in]
> The number of rows of the lower trapezoidal part of B.
> MIN(M,N) >= L >= 0.  See Further Details.

MB : INTEGER [in]
> The block size to be used in the blocked QR.  M >= MB >= 1.

A : COMPLEX array, dimension (LDA,M) [in,out]
> On entry, the lower triangular M-by-M matrix A.
> On exit, the elements on and below the diagonal of the array
> contain the lower triangular matrix L.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

B : COMPLEX array, dimension (LDB,N) [in,out]
> On entry, the pentagonal M-by-N matrix B.  The first N-L columns
> are rectangular, and the last L columns are lower trapezoidal.
> On exit, B contains the pentagonal matrix V.  See Further Details.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,M).

T : COMPLEX array, dimension (LDT,N) [out]
> The lower triangular block reflectors stored in compact form
> as a sequence of upper triangular blocks.  See Further Details.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= MB.

WORK : COMPLEX array, dimension (MB\*M) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
