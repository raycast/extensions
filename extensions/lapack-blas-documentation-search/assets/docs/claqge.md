```fortran
subroutine claqge (
        integer m,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) r,
        real, dimension( * ) c,
        real rowcnd,
        real colcnd,
        real amax,
        character equed
)
```

CLAQGE equilibrates a general M by N matrix A using the row and
column scaling factors in the vectors R and C.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the M by N matrix A.
> On exit, the equilibrated matrix.  See EQUED for the form of
> the equilibrated matrix.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(M,1).

R : REAL array, dimension (M) [in]
> The row scale factors for A.

C : REAL array, dimension (N) [in]
> The column scale factors for A.

ROWCND : REAL [in]
> Ratio of the smallest R(i) to the largest R(i).

COLCND : REAL [in]
> Ratio of the smallest C(i) to the largest C(i).

AMAX : REAL [in]
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
