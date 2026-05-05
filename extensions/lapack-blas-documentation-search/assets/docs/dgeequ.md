```fortran
subroutine dgeequ (
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) r,
        double precision, dimension( * ) c,
        double precision rowcnd,
        double precision colcnd,
        double precision amax,
        integer info
)
```

DGEEQU computes row and column scalings intended to equilibrate an
M-by-N matrix A and reduce its condition number.  R returns the row
scale factors and C the column scale factors, chosen to try to make
the largest element in each row and column of the matrix B with
elements B(i,j)=R(i)\*A(i,j)\*C(j) have absolute value 1.

R(i) and C(j) are restricted to be between SMLNUM = smallest safe
number and BIGNUM = largest safe number.  Use of these scaling
factors is not guaranteed to reduce the condition number of A but
works well in practice.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in]
> The M-by-N matrix whose equilibration factors are
> to be computed.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

R : DOUBLE PRECISION array, dimension (M) [out]
> If INFO = 0 or INFO > M, R contains the row scale factors
> for A.

C : DOUBLE PRECISION array, dimension (N) [out]
> If INFO = 0,  C contains the column scale factors for A.

ROWCND : DOUBLE PRECISION [out]
> If INFO = 0 or INFO > M, ROWCND contains the ratio of the
> smallest R(i) to the largest R(i).  If ROWCND >= 0.1 and
> AMAX is neither too large nor too small, it is not worth
> scaling by R.

COLCND : DOUBLE PRECISION [out]
> If INFO = 0, COLCND contains the ratio of the smallest
> C(i) to the largest C(i).  If COLCND >= 0.1, it is not
> worth scaling by C.

AMAX : DOUBLE PRECISION [out]
> Absolute value of largest matrix element.  If AMAX is very
> close to overflow or very close to underflow, the matrix
> should be scaled.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i,  and i is
> <= M:  the i-th row of A is exactly zero
> >  M:  the (i-M)-th column of A is exactly zero
