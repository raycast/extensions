```fortran
recursive subroutine zgelqt3 (
        integer m,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldt, * ) t,
        integer ldt,
        integer info
)
```

ZGELQT3 recursively computes a LQ factorization of a complex M-by-N
matrix A, using the compact WY representation of Q.

Based on the algorithm of Elmroth and Gustavson,
IBM J. Res. Develop. Vol 44 No. 4 July 2000.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M =< N.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the complex M-by-N matrix A.  On exit, the elements on and
> below the diagonal contain the N-by-N lower triangular matrix L; the
> elements above the diagonal are the rows of V.  See below for
> further details.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

T : COMPLEX\*16 array, dimension (LDT,N) [out]
> The N-by-N upper triangular factor of the block reflector.
> The elements on and above the diagonal contain the block
> reflector T; the elements below the diagonal are not used.
> See below for further details.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= max(1,N).

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
