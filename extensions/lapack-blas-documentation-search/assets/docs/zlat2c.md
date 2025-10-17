```fortran
subroutine zlat2c (
        character uplo,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldsa, * ) sa,
        integer ldsa,
        integer info
)
```

ZLAT2C converts a COMPLEX\*16 triangular matrix, SA, to a COMPLEX
triangular matrix, A.

RMAX is the overflow for the SINGLE PRECISION arithmetic
ZLAT2C checks that all the entries of A are between -RMAX and
RMAX. If not the conversion is aborted and a flag is raised.

This is an auxiliary routine so there is no argument checking.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  A is upper triangular;
> = 'L':  A is lower triangular.

N : INTEGER [in]
> The number of rows and columns of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in]
> On entry, the N-by-N triangular coefficient matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

SA : COMPLEX array, dimension (LDSA,N) [out]
> Only the UPLO part of SA is referenced.  On exit, if INFO=0,
> the N-by-N coefficient matrix SA; if INFO>0, the content of
> the UPLO part of SA is unspecified.

LDSA : INTEGER [in]
> The leading dimension of the array SA.  LDSA >= max(1,M).

INFO : INTEGER [out]
> = 0:  successful exit.
> = 1:  an entry of the matrix A is greater than the SINGLE
> PRECISION overflow threshold, in this case, the content
> of the UPLO part of SA in exit is unspecified.
