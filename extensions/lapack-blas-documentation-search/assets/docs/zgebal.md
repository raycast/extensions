```fortran
subroutine zgebal (
        character job,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        integer ilo,
        integer ihi,
        double precision, dimension( * ) scale,
        integer info
)
```

ZGEBAL balances a general complex matrix A.  This involves, first,
permuting A by a similarity transformation to isolate eigenvalues
in the first 1 to ILO-1 and last IHI+1 to N elements on the
diagonal; and second, applying a diagonal similarity transformation
to rows and columns ILO to IHI to make the rows and columns as
close in norm as possible.  Both steps are optional.

Balancing may reduce the 1-norm of the matrix, and improve the
accuracy of the computed eigenvalues and/or eigenvectors.

## Parameters
JOB : CHARACTER\*1 [in]
> Specifies the operations to be performed on A:
> = 'N':  none:  simply set ILO = 1, IHI = N, SCALE(I) = 1.0
> for i = 1,...,N;
> = 'P':  permute only;
> = 'S':  scale only;
> = 'B':  both permute and scale.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> On entry, the input matrix A.
> On exit,  A is overwritten by the balanced matrix.
> If JOB = 'N', A is not referenced.
> See Further Details.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

ILO : INTEGER [out]

IHI : INTEGER [out]
> ILO and IHI are set to integers such that on exit
> A(i,j) = 0 if i > j and j = 1,...,ILO-1 or I = IHI+1,...,N.
> If JOB = 'N' or 'S', ILO = 1 and IHI = N.

SCALE : DOUBLE PRECISION array, dimension (N) [out]
> Details of the permutations and scaling factors applied to
> A.  If P(j) is the index of the row and column interchanged
> with row and column j and D(j) is the scaling factor
> applied to row and column j, then
> SCALE(j) = P(j)    for j = 1,...,ILO-1
> = D(j)    for j = ILO,...,IHI
> = P(j)    for j = IHI+1,...,N.
> The order in which the interchanges are made is N to IHI+1,
> then 1 to ILO-1.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
