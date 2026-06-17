```fortran
subroutine dlaqge (
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) r,
        double precision, dimension( * ) c,
        double precision rowcnd,
        double precision colcnd,
        double precision amax,
        character equed
)
```

DLAQGE equilibrates a general M by N matrix A using the row and
column scaling factors in the vectors R and C.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the M by N matrix A.
> On exit, the equilibrated matrix.  See EQUED for the form of
> the equilibrated matrix.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(M,1).

R : DOUBLE PRECISION array, dimension (M) [in]
> The row scale factors for A.

C : DOUBLE PRECISION array, dimension (N) [in]
> The column scale factors for A.

ROWCND : DOUBLE PRECISION [in]
> Ratio of the smallest R(i) to the largest R(i).

COLCND : DOUBLE PRECISION [in]
> Ratio of the smallest C(i) to the largest C(i).

AMAX : DOUBLE PRECISION [in]
> Absolute value of largest matrix entry.

EQUED : CHARACTER\*1 [out]
> Specifies the form of equilibration that was done.
> = 'N':  No equilibration
> = 'R':  Row equilibration, i.e., A has been premultiplied by
> diag(R).
> = 'C':  Column equilibration, i.e., A has been postmultiplied
> by diag(C).
> = 'B':  Both row and column equilibration, i.e., A has been
> replaced by diag(R) \* A \* diag(C).
