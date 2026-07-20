```fortran
subroutine clarcm (
        integer m,
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( ldc, * ) c,
        integer ldc,
        real, dimension( * ) rwork
)
```

CLARCM performs a very simple matrix-matrix multiplication:
C := A \* B,
where A is M by M and real; B is M by N and complex;
C is M by N and complex.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A and of the matrix C.
> M >= 0.

N : INTEGER [in]
> The number of columns and rows of the matrix B and
> the number of columns of the matrix C.
> N >= 0.

A : REAL array, dimension (LDA, M) [in]
> On entry, A contains the M by M matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >=max(1,M).

B : COMPLEX array, dimension (LDB, N) [in]
> On entry, B contains the M by N matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >=max(1,M).

C : COMPLEX array, dimension (LDC, N) [out]
> On exit, C contains the M by N matrix C.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >=max(1,M).

RWORK : REAL array, dimension (2\*M\*N) [out]
