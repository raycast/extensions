```fortran
subroutine cgeqr2 (
        integer m,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( * ) tau,
        complex, dimension( * ) work,
        integer info
)
```

CGEQR2 computes a QR factorization of a complex m-by-n matrix A:

A = Q \* ( R ),
( 0 )

where:

Q is a m-by-m orthogonal matrix;
R is an upper-triangular n-by-n matrix;
0 is a (m-n)-by-n zero matrix, if m > n.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the m by n matrix A.
> On exit, the elements on and above the diagonal of the array
> contain the min(m,n) by n upper trapezoidal matrix R (R is
> upper triangular if m >= n); the elements below the diagonal,
> with the array TAU, represent the unitary matrix Q as a
> product of elementary reflectors (see Further Details).

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

TAU : COMPLEX array, dimension (min(M,N)) [out]
> The scalar factors of the elementary reflectors (see Further
> Details).

WORK : COMPLEX array, dimension (N) [out]

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
