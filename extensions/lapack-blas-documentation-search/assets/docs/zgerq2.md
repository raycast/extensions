```fortran
subroutine zgerq2 (
        integer m,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( * ) tau,
        complex*16, dimension( * ) work,
        integer info
)
```

ZGERQ2 computes an RQ factorization of a complex m by n matrix A:
A = R \* Q.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the m by n matrix A.
> On exit, if m <= n, the upper triangle of the subarray
> A(1:m,n-m+1:n) contains the m by m upper triangular matrix R;
> if m >= n, the elements on and above the (m-n)-th subdiagonal
> contain the m by n upper trapezoidal matrix R; the remaining
> elements, with the array TAU, represent the unitary matrix
> Q as a product of elementary reflectors (see Further
> Details).

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

TAU : COMPLEX\*16 array, dimension (min(M,N)) [out]
> The scalar factors of the elementary reflectors (see Further
> Details).

WORK : COMPLEX\*16 array, dimension (M) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
