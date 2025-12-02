```fortran
subroutine zlag2c (
        integer m,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldsa, * ) sa,
        integer ldsa,
        integer info
)
```

ZLAG2C converts a COMPLEX\*16 matrix, SA, to a COMPLEX matrix, A.

RMAX is the overflow for the SINGLE PRECISION arithmetic
ZLAG2C checks that all the entries of A are between -RMAX and
RMAX. If not the conversion is aborted and a flag is raised.

This is an auxiliary routine so there is no argument checking.

## Parameters
M : INTEGER [in]
> The number of lines of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in]
> On entry, the M-by-N coefficient matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

SA : COMPLEX array, dimension (LDSA,N) [out]
> On exit, if INFO=0, the M-by-N coefficient matrix SA; if
> INFO>0, the content of SA is unspecified.

LDSA : INTEGER [in]
> The leading dimension of the array SA.  LDSA >= max(1,M).

INFO : INTEGER [out]
> = 0:  successful exit.
> = 1:  an entry of the matrix A is greater than the SINGLE
> PRECISION overflow threshold, in this case, the content
> of SA in exit is unspecified.
