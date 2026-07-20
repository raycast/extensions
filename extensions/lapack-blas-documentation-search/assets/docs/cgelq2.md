```fortran
subroutine cgelq2 (
        integer m,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( * ) tau,
        complex, dimension( * ) work,
        integer info
)
```

CGELQ2 computes an LQ factorization of a complex m-by-n matrix A:

A = ( L 0 ) \*  Q

where:

Q is a n-by-n orthogonal matrix;
L is a lower-triangular m-by-m matrix;
0 is a m-by-(n-m) zero matrix, if m < n.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the m by n matrix A.
> On exit, the elements on and below the diagonal of the array
> contain the m by min(m,n) lower trapezoidal matrix L (L is
> lower triangular if m <= n); the elements above the diagonal,
> with the array TAU, represent the unitary matrix Q as a
> product of elementary reflectors (see Further Details).

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

TAU : COMPLEX array, dimension (min(M,N)) [out]
> The scalar factors of the elementary reflectors (see Further
> Details).

WORK : COMPLEX array, dimension (M) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
