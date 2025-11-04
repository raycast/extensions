```fortran
subroutine clag2z (
        integer m,
        integer n,
        complex, dimension( ldsa, * ) sa,
        integer ldsa,
        complex*16, dimension( lda, * ) a,
        integer lda,
        integer info
)
```

CLAG2Z converts a COMPLEX matrix, SA, to a COMPLEX\*16 matrix, A.

Note that while it is possible to overflow while converting
from double to single, it is not possible to overflow when
converting from single to double.

This is an auxiliary routine so there is no argument checking.

## Parameters
M : INTEGER [in]
> The number of lines of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

SA : COMPLEX array, dimension (LDSA,N) [in]
> On entry, the M-by-N coefficient matrix SA.

LDSA : INTEGER [in]
> The leading dimension of the array SA.  LDSA >= max(1,M).

A : COMPLEX\*16 array, dimension (LDA,N) [out]
> On exit, the M-by-N coefficient matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

INFO : INTEGER [out]
> = 0:  successful exit
