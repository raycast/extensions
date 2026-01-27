```fortran
subroutine dlacpy (
        character uplo,
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldb, * ) b,
        integer ldb
)
```

DLACPY copies all or part of a two-dimensional matrix A to another
matrix B.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies the part of the matrix A to be copied to B.
> = 'U':      Upper triangular part
> = 'L':      Lower triangular part
> Otherwise:  All of the matrix A

M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in]
> The m by n matrix A.  If UPLO = 'U', only the upper triangle
> or trapezoid is accessed; if UPLO = 'L', only the lower
> triangle or trapezoid is accessed.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

B : DOUBLE PRECISION array, dimension (LDB,N) [out]
> On exit, B = A in the locations specified by UPLO.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,M).
